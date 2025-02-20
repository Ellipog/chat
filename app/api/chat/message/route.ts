import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { connectToDatabase } from "@/lib/mongodb";
import Message from "@/models/Message";
import jwt from "jsonwebtoken";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { z } from "zod";
import { OpenAIStream } from "@/lib/openAIStream";

// Request validation schema
const messageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().optional(),
});

export async function POST(req: Request) {
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
    const validationResult = messageSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { message, conversationId } = validationResult.data;

    // Verify token and get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };

    await connectToDatabase();

    // Get user info for context
    const user = await User.findById(decoded.id).select("userInfo");
    if (!user) {
      return NextResponse.json(
        { error: "User account not found" },
        { status: 404 }
      );
    }

    let currentConversationId = conversationId;
    let newConversation = null;

    if (!currentConversationId) {
      // Generate conversation topic using a more focused prompt
      const topicResponse = await openai.chat.completions.create({
        model: process.env.OPEN_AI_MODEL as string,
        messages: [
          {
            role: "system",
            content:
              "Extract a topic from the user's message that captures the main subject. Return only the topic, no additional text or punctuation. Proper capitalization is important.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.7,
      });

      const topic =
        topicResponse.choices[0].message.content?.trim() || "New Chat";

      // Create new conversation
      newConversation = await Conversation.create({
        user: decoded.id,
        title: topic,
        lastMessageAt: new Date(),
      });
      currentConversationId = newConversation._id;

      // Create initial user message
      await Message.create({
        user: decoded.id,
        conversationId: currentConversationId,
        content: message,
        role: "user",
        createdAt: new Date(),
      });
    }

    // For existing conversations or follow-up requests for new conversations
    if (!newConversation) {
      // Create user message
      await Message.create({
        user: decoded.id,
        conversationId: currentConversationId,
        content: message,
        role: "user",
        createdAt: new Date(),
      });
    }

    // Get conversation history
    const messageHistory = await Message.find({
      conversationId: currentConversationId,
    }).sort({ createdAt: 1 });

    // Format messages for OpenAI
    const messages = [
      {
        role: "system",
        content: `You are a helpful AI assistant. The user has provided the following information about themselves: ${
          user.userInfo
            ? JSON.stringify(user.userInfo)
            : "No additional info provided"
        }`,
      },
      ...messageHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Create streaming response
    const response = await openai.chat.completions.create({
      model: process.env.OPEN_AI_MODEL as string,
      messages,
      stream: true,
      temperature: 0.7,
    });

    // Stream the response
    const stream = OpenAIStream(
      response,
      user.userInfo || [],
      async (fullContent: string) => {
        try {
          await Message.create({
            user: decoded.id,
            conversationId: currentConversationId,
            content: fullContent,
            role: "assistant",
            createdAt: new Date(),
          });

          await Conversation.findByIdAndUpdate(currentConversationId, {
            lastMessageAt: new Date(),
          });
        } catch (error) {
          console.error("Error saving assistant message:", error);
        }
      }
    );

    // Return both the new conversation and the stream
    const readable = new ReadableStream({
      start(controller) {
        const reader = stream.getReader();
        return pump();
        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            return pump();
          });
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        ...(newConversation && {
          "X-Conversation-Data": JSON.stringify(newConversation),
        }),
      },
    });
  } catch (error) {
    console.error("Error in message route:", error);
    const err = error as Error;
    return NextResponse.json(
      {
        error: "Failed to process message",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
