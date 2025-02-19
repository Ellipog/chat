import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };
    await connectToDatabase();

    const conversations = await Conversation.find({ user: decoded.id }).sort({
      lastMessageAt: -1,
    });

    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
