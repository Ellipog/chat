import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { OpenAIStream } from "@/lib/openAIStream";
import { connectToDatabase } from "@/lib/mongodb";
import Message from "@/models/Message";
import jwt from "jsonwebtoken";
import { z } from "zod";

// Request validation schema
const streamRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().min(1, "Conversation ID is required"),
  userInfo: z
    .array(
      z.object({
        category: z.string(),
        info: z.string(),
        createdAt: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(req: Request) {
  let cleanup: (() => void) | null = null;
  const activeConnections = new Set<AbortController>();

  try {
    // Validate authentication
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Authentication token is required" },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await req.json();
    const validationResult = streamRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { message, conversationId, userInfo } = validationResult.data;

    // Verify token and get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };

    await connectToDatabase();

    // Get previous messages with pagination and limit
    const previousMessages = await Message.find({
      conversationId,
      user: decoded.id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Prepare messages array for OpenAI with proper ordering
    const messageHistory = previousMessages.reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Create abort controller for this request
    const abortController = new AbortController();
    activeConnections.add(abortController);

    // Start chat stream
    const chatStream = await openai.chat.completions.create(
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant. You can use markdown for formatting your responses.
            Context about the user: ${JSON.stringify(userInfo || [])}`,
          },
          ...messageHistory,
          {
            role: "user",
            content: message,
          },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      },
      { signal: abortController.signal }
    );

    let fullContent = "";
    const stream = OpenAIStream(chatStream, [], async (content) => {
      try {
        // Save the assistant's message only when we have the complete content
        if (content) {
          fullContent = content;
          await Message.create({
            user: decoded.id,
            conversationId,
            content: fullContent,
            role: "assistant",
            createdAt: new Date(),
          });
        }
      } catch (error) {
        console.error("Error processing stream completion:", error);
      }
    });

    // Set up cleanup function
    cleanup = () => {
      activeConnections.delete(abortController);
      abortController.abort();
    };

    // Handle request abortion
    req.signal.addEventListener("abort", () => {
      cleanup?.();
    });

    const streamResponse = new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    return streamResponse;
  } catch (error) {
    // Always try to run cleanup if we have it
    cleanup?.();

    console.error("Error in stream route:", error);
    const err = error as Error & { code?: string };
    return NextResponse.json(
      {
        error: "Failed to process stream",
        details: err.message || "Unknown error",
        code: err.code,
      },
      { status: 500 }
    );
  }
}
