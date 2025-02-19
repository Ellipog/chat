import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Message from "@/models/Message";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };
    await connectToDatabase();

    const messages = await Message.find({
      conversationId,
      user: decoded.id,
    }).sort({ createdAt: 1 });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error in messages route:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
