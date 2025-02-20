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
      model: process.env.OPEN_AI_MODEL as string,
      messages: [
        {
          role: "system",
          content: `You are an AI designed to extract personal information and recurring interests from messages.
          Look for:
          1. New, factual information about the user that isn't already in their profile
          2. Topics, subjects, or themes they consistently discuss or show strong interest in
          
          You must respond with ONLY a JSON array of strings containing the new information found, or an empty array if no new information is found.
          Example response format: 
          ["Works as a Software Engineer", "Lives in Seattle", "Prefers not to be called 'Bob'", "Shows strong interest in machine learning", "Frequently discusses cryptocurrency trading"] or []
          
          Guidelines:
          - Use proper capitalization and complete sentences
          - For interests/topics: Only include if they appear to be consistent interests or frequently discussed topics
          - Include preferences or corrections to previously known information (e.g., preferred names, pronouns, or corrections to stored facts)
          - For interests, use phrases like "Shows strong interest in...", "Frequently discusses...", or "Regularly talks about..."
          
          Previously known information (do not include any of these unless providing a correction/preference):
          ${userInfo.map((info) => info.info).join("\n")}`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.1,
    });

    const analysisContent = analysisResponse.choices[0].message.content;
    let newInfo: { info: string }[] = [];

    try {
      if (analysisContent) {
        const parsedContent = JSON.parse(analysisContent.trim());
        // Convert string array to required format with auto-categorization
        newInfo = Array.isArray(parsedContent)
          ? parsedContent.map((info) => ({
              info: info,
            }))
          : [];
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
