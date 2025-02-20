import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const generateUniqueId = () => {
  return crypto.randomBytes(16).toString("hex");
};

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

    // Verify token and get user ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const attachments = await Promise.all(
      files.map(async (file) => {
        const fileId = generateUniqueId();
        const fileExtension = file.name.split(".").pop();
        const key = `uploads/${decoded.id}/${fileId}.${fileExtension}`;

        // Upload the file to S3
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
          })
        );

        return {
          _id: fileId,
          filename: file.name,
          contentType: file.type,
          url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
          size: file.size,
        };
      })
    );

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error("Error in upload route:", error);
    const err = error as Error;
    return NextResponse.json(
      {
        error: "Failed to upload files",
        details: err.message,
      },
      { status: 500 }
    );
  }
}
