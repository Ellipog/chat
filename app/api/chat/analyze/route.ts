import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { z } from "zod";

// Request validation schema
const analyzeRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  userInfo: z
    .array(
      z.object({
        category: z.string(),
        info: z.string(),
        createdAt: z.string().optional(),
      })
    )
    .default([]),
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
    const validationResult = analyzeRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { message, userInfo } = validationResult.data;

    // Verify token and get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };

    // Analyze the message for new user information
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an AI designed to extract personal information from messages. 
          Look for new, factual information about the user that isn't already in their profile.
          You must respond with ONLY a JSON array of objects with 'category' and 'info' fields, or an empty array if no new information is found.
          Example response format: [{"category": "Occupation", "info": "Software Engineer"}] or []
          Categories should be specific but reusable (e.g., "Occupation", "Location", "Hobby", "Family", "Education", etc.).
          Only extract factual, concrete information, not opinions or temporary states. Proper capitalization is important.
          Current user info: ${JSON.stringify(userInfo)}`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.1,
    });

    const analysisContent = analysisResponse.choices[0].message.content;
    let newInfo: { category: string; info: string }[] = [];

    try {
      if (analysisContent) {
        const parsedContent = JSON.parse(analysisContent.trim());
        newInfo = Array.isArray(parsedContent) ? parsedContent : [];
      }
    } catch (error) {
      console.error("Error parsing analysis response:", error);
      newInfo = [];
    }

    // Update user info if new information was found
    if (newInfo.length > 0) {
      await connectToDatabase();

      const newUserInfo = newInfo.map((info) => ({
        ...info,
        createdAt: new Date(),
      }));

      await User.findByIdAndUpdate(
        decoded.id,
        {
          $push: {
            userInfo: {
              $each: newUserInfo,
            },
          },
        },
        { new: true }
      );
    }

    return NextResponse.json({
      success: true,
      newInfo,
    });
  } catch (error) {
    console.error("Error in analyze route:", error);
    const err = error as Error;
    return NextResponse.json(
      {
        error: "Failed to analyze message",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
