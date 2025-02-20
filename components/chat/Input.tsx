"use client";

import { motion } from "framer-motion";
import TextInput from "@/components/ui/TextInput";
import { ArrowRight, Paperclip, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useChatContext } from "@/context/context";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { Use } from "@/lib/uselessUse";
import { FileAttachment } from "@/types/chat";
import * as pdfjs from "pdfjs-dist";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

// Allowed file types that OpenAI can process
const ALLOWED_FILE_TYPES = {
  // Images
  "image/jpeg": true,
  "image/png": true,
  "image/gif": true,
  "image/webp": true,
  // Documents that will be converted to images
  "application/pdf": true,
  "text/plain": true,
  "text/csv": true,
  "text/markdown": true,
};

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit

// Helper function to convert PDF to image
async function convertPDFToImage(file: File): Promise<File[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const images: File[] = [];

  for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 20); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context!,
      viewport: viewport,
    }).promise;

    const imageBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), "image/png", 0.95);
    });

    const imageFile = new File(
      [imageBlob],
      `${file.name.replace(/\.[^/.]+$/, "")}_page_${pageNum}.png`,
      { type: "image/png" }
    );
    images.push(imageFile);
  }

  return images;
}

// Helper function to convert text to image
async function convertTextToImage(file: File): Promise<File> {
  const text = await file.text();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;

  // Set canvas size
  const fontSize = 16;
  const lineHeight = fontSize * 1.2;
  const padding = 20;
  const maxWidth = 800;

  // Split text into lines
  context.font = `${fontSize}px Arial`;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = context.measureText(testLine);

    if (metrics.width > maxWidth - padding * 2) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  // Set canvas dimensions
  canvas.width = maxWidth;
  canvas.height = lines.length * lineHeight + padding * 2;

  // Draw background
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text
  context.fillStyle = "black";
  context.font = `${fontSize}px Arial`;
  lines.forEach((line, i) => {
    context.fillText(line, padding, padding + (i + 1) * lineHeight);
  });

  const imageBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png", 0.95);
  });

  return new File([imageBlob], `${file.name.replace(/\.[^/.]+$/, "")}.png`, {
    type: "image/png",
  });
}

// Helper function to convert any file to image
async function convertFileToImage(file: File): Promise<File[]> {
  if (file.type === "application/pdf") {
    return convertPDFToImage(file);
  } else if (["text/plain", "text/csv", "text/markdown"].includes(file.type)) {
    return [await convertTextToImage(file)];
  }
  return [file];
}

export default function ChatInput() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const {
    currentConversation,
    addNewConversation,
    invalidateMessagesCache,
    user,
    updateUser,
  } = useChatContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  // Cleanup on conversation switch
  useEffect(() => {
    const abortController = activeRequestRef.current;

    return () => {
      if (abortController) {
        abortController.abort();
        activeRequestRef.current = null;
        setIsLoading(false);
      }
    };
  }, [currentConversation?._id]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
      return `File type ${file.type} is not supported. Allowed types: images (JPEG, PNG, GIF, WebP), PDF, text files, CSV, and Markdown.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File ${file.name} is too large. Maximum size is 20MB.`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFileError("");

    // Validate each file
    const validFiles: File[] = [];
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
      validFiles.push(file);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (): Promise<FileAttachment[]> => {
    if (!selectedFiles.length) return [];

    const formData = new FormData();

    // Convert files to images if needed
    const convertedFiles: File[] = [];
    for (const file of selectedFiles) {
      const converted = await convertFileToImage(file);
      convertedFiles.push(...converted);
    }

    convertedFiles.forEach((file) => {
      formData.append("files", file);
    });

    const token = localStorage.getItem("token");
    if (!token) return [];

    try {
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload files");
      }

      const data = await response.json();
      setSelectedFiles([]);
      return data.attachments;
    } catch (error) {
      console.error("Error uploading files:", error);
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (isLoading) return;
    e.preventDefault();
    if ((!message.trim() && !selectedFiles.length) || isLoading) return;

    setIsLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Upload files first if any
    const attachments = await uploadFiles();

    // Create new abort controller for this request
    activeRequestRef.current = new AbortController();

    const tempId = `temp-${Date.now()}`;
    let conversationId = currentConversation?._id || "";
    // Immediately add user message to UI
    const userMessage = {
      _id: tempId,
      content: message,
      role: "user" as const,
      createdAt: new Date().toISOString(),
      conversationId: currentConversation?._id || "",
      attachments,
    };
    window.dispatchEvent(
      new CustomEvent("newMessage", { detail: userMessage })
    );

    // Clear the message input and files early to improve UX
    const currentMessage = message;
    setMessage("");
    setSelectedFiles([]);
    inputRef.current?.focus();

    try {
      const [analyzeResponse, messageResponse] = await Promise.all([
        fetch("/api/chat/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: currentMessage,
            conversationId: currentConversation?._id,
          }),
          signal: activeRequestRef.current.signal,
        }),
        fetch("/api/chat/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: currentMessage,
            conversationId: currentConversation?._id,
            attachments,
          }),
          signal: activeRequestRef.current.signal,
        }),
      ]);

      Use(analyzeResponse);

      if (!messageResponse.ok) {
        const error = await messageResponse.json();
        throw new Error(error.error || "Failed to send message");
      }

      // Handle new conversation creation
      const newConversationData = messageResponse.headers.get(
        "X-Conversation-Data"
      );
      if (newConversationData) {
        const newConversation = JSON.parse(newConversationData);
        addNewConversation(newConversation);
        conversationId = newConversation._id;
      }

      // Handle streaming
      await handleStreamingResponse(
        messageResponse.body!,
        conversationId || "",
        tempId
      );

      // Invalidate the messages cache for this conversation after streaming is complete
      if (conversationId) {
        invalidateMessagesCache(conversationId);
      }

      if (analyzeResponse.ok) {
        const analyzeData = await analyzeResponse.json();
        if (analyzeData.newInfo && analyzeData.newInfo.length > 0 && user) {
          const updatedUser = {
            ...user,
            userInfo: [...(user.userInfo || []), ...analyzeData.newInfo],
          };
          updateUser(updatedUser);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Error sending message:", error);
        // Remove temporary messages on error
        window.dispatchEvent(
          new CustomEvent("removeMessage", { detail: { id: tempId } })
        );
      }
    } finally {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  };

  // Helper function to handle streaming responses
  const handleStreamingResponse = async (
    responseBody: ReadableStream<Uint8Array>,
    conversationId: string,
    tempUserId: string
  ) => {
    const reader = responseBody.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Create a unique ID for this AI response
    const tempAssistantId = `temp-assistant-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create a temporary message for streaming
    const tempAssistantMessage = {
      _id: tempAssistantId,
      content: "",
      role: "assistant" as const,
      createdAt: new Date().toISOString(),
      conversationId: conversationId,
    };
    window.dispatchEvent(
      new CustomEvent("newMessage", { detail: tempAssistantMessage })
    );

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        buffer += text;

        // Update the assistant message with current content
        const updatedAssistantMessage = {
          ...tempAssistantMessage,
          content: buffer,
        };
        window.dispatchEvent(
          new CustomEvent("updateMessage", {
            detail: updatedAssistantMessage,
          })
        );
      }
    } catch (error) {
      console.error("Error processing stream:", error);
      // Remove temporary messages on error
      window.dispatchEvent(
        new CustomEvent("removeMessage", {
          detail: {
            id: tempAssistantMessage._id,
            userMessageId: tempUserId,
          },
        })
      );
    } finally {
      // Ensure the final message is displayed even if there's an error
      if (buffer) {
        const finalMessage = {
          ...tempAssistantMessage,
          content: buffer,
        };
        window.dispatchEvent(
          new CustomEvent("updateMessage", {
            detail: finalMessage,
          })
        );
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex justify-center fixed bottom-24">
        <motion.form
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-2 w-[40rem] max-w-[600px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div className="w-full flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept={Object.keys(ALLOWED_FILE_TYPES).join(",")}
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-gray-300 dark:border-gray-600 py-2.5 px-3 rounded-2xl shadow-lg bg-white dark:bg-gray-900 transition-all duration-300"
              disabled={isLoading}
            >
              <Paperclip className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex flex-row w-full border-2 border-gray-300 dark:border-gray-600 py-2 px-3 rounded-2xl shadow-lg bg-white dark:bg-gray-900">
              <TextInput
                ref={inputRef}
                value={message}
                onChange={setMessage}
                placeholder="Hi"
                minimal
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={
                  isLoading || (!message.trim() && !selectedFiles.length)
                }
                className="hover:bg-gray-100 disabled:opacity-50 transition-all duration-300 relative"
              >
                {isLoading ? (
                  <LoadingScreen size="small" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>
          {fileError && (
            <div className="absolute top-14 w-full text-center text-red-500 text-sm">
              {fileError}
            </div>
          )}
          {selectedFiles.length > 0 && (
            <div className="absolute top-14 w-full flex justify-center">
              <div className="w-[40rem] max-w-[600px] overflow-x-auto pb-2">
                <div className="flex flex-nowrap gap-2 min-w-min">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 border-2 border-gray-300 dark:border-gray-600 py-2.5 px-3 rounded-2xl bg-white dark:bg-gray-900 flex flex-row items-center gap-2"
                    >
                      <span className="text-sm truncate max-w-[150px]">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.form>
      </div>
    </div>
  );
}
