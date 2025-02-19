import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { connectToDatabase } from "@/lib/mongodb";
import Message from "@/models/Message";
import jwt from "jsonwebtoken";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { z } from "zod";

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
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "Extract a concise 2-4 word topic from the user's message that captures the main subject. Return only the topic, no additional text or punctuation.",
          },
          {
            role: "user",
            content: message,
          },
        ],
        temperature: 0.3,
        max_tokens: 10,
      });

      const topic =
        topicResponse.choices[0].message.content?.trim() || "New Chat";

      // Create new conversation with retry logic
      for (let i = 0; i < 3; i++) {
        try {
          newConversation = await Conversation.create({
            user: decoded.id,
            title: topic,
            lastMessageAt: new Date(),
          });
          currentConversationId = newConversation._id;
          break;
        } catch (error) {
          if (i === 2) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } else {
      // Update last message timestamp for existing conversation
      await Conversation.findByIdAndUpdate(currentConversationId, {
        lastMessageAt: new Date(),
      });
    }

    // Create user message with retry logic
    for (let i = 0; i < 3; i++) {
      try {
        await Message.create({
          user: decoded.id,
          conversationId: currentConversationId,
          content: message,
          role: "user",
          createdAt: new Date(),
        });
        break;
      } catch (error) {
        if (i === 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Trigger message analysis in the background
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    fetch(`${baseUrl}/api/chat/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message,
        userInfo: user.userInfo || [],
      }),
    }).catch((error) => {
      console.error("Background analysis failed:", error);
    });

    return NextResponse.json({
      success: true,
      newConversation,
      conversationId: currentConversationId,
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
