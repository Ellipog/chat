import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { connectToDatabase } from "@/lib/mongodb";
import Message from "@/models/Message";
import jwt from "jsonwebtoken";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { z } from "zod";
import { OpenAIStream } from "@/lib/openAIStream";
import { FileAttachment, MessageWithAttachments } from "@/types/chat";
import {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
} from "openai/resources/chat/completions";

// Request validation schema
const messageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        _id: z.string(),
        filename: z.string(),
        contentType: z.string(),
        url: z.string(),
        size: z.number(),
      })
    )
    .optional(),
});

interface UserInfo {
  info: string;
  createdAt?: Date;
}

function createSystemMessage(
  userInfo: UserInfo[] | null
): ChatCompletionSystemMessageParam {
  return {
    role: "system",
    content: `You are a helpful AI assistant with the ability to perceive and understand shared files.

File Handling Capabilities:
1. For Images:
   - You can see and analyze the content of images
   - Reference specific details from images in your responses
   - Describe what you observe in the images when relevant

2. For Other Files:
   - You can see file names, types, and sizes
   - Acknowledge and reference files appropriately
   - Provide relevant suggestions based on file types

When responding:
- If an image is shared, describe what you see in it
- Reference files by name when discussing them
- Consider file context in your responses
- Be specific about which file you're referring to if multiple are shared

User Information:
${
  userInfo
    ? JSON.stringify(
        userInfo.map((info) => info.info),
        null,
        2
      )
    : "No additional info provided"
}`,
  };
}

function createMessageContent(
  text: string,
  files?: FileAttachment[]
): ChatCompletionContentPart[] {
  const content: ChatCompletionContentPart[] = [];

  // Add text content first if it exists
  if (text.trim()) {
    content.push({ type: "text", text });
  }

  // Add files
  if (files?.length) {
    files.forEach((file) => {
      if (file.contentType.startsWith("image/")) {
        content.push({
          type: "image_url",
          image_url: {
            url: file.url,
            detail: "high",
          },
        });
      } else {
        // For non-image files, add a descriptive text
        content.push({
          type: "text",
          text: `\n[File: ${file.filename} (${file.contentType}, ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB)]\n`,
        });
      }
    });
  }

  return content;
}

function formatMessageForHistory(
  msg: MessageWithAttachments
): ChatCompletionMessageParam {
  const hasImages = msg.attachments?.some((attachment: FileAttachment) =>
    attachment.contentType.startsWith("image/")
  );

  const baseMessage = {
    role: msg.role,
    ...(msg.name && { name: msg.name }),
  };

  if (hasImages || msg.attachments?.length) {
    return {
      ...baseMessage,
      content: createMessageContent(msg.content, msg.attachments),
    } as ChatCompletionMessageParam;
  }

  // For messages without attachments, use simple text format
  return {
    ...baseMessage,
    content: msg.content,
  } as ChatCompletionMessageParam;
}

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

    const { message, conversationId, attachments } = validationResult.data;

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
              "Extract a concise topic from the message. Consider both text and any attached files. Return only the topic with proper capitalization, no additional text or punctuation.",
          },
          {
            role: "user",
            content: createMessageContent(message, attachments),
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
        attachments,
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
        attachments,
      });
    }

    // Get conversation history
    const messageHistory = await Message.find({
      conversationId: currentConversationId,
    }).sort({ createdAt: 1 });

    // Format messages for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      createSystemMessage(user.userInfo),
      ...messageHistory.map(formatMessageForHistory),
    ];

    // Check if any message contains images
    const hasImages = messageHistory.some((msg) =>
      msg.attachments?.some((attachment: FileAttachment) =>
        attachment.contentType.startsWith("image/")
      )
    );

    // Create streaming response
    const response = await openai.chat.completions.create({
      model: process.env.OPEN_AI_MODEL as string,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: hasImages ? 4096 : undefined,
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
