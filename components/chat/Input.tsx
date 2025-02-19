"use client";

import { motion } from "framer-motion";
import TextInput from "@/components/ui/TextInput";
import { ArrowRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useChatContext } from "@/context/context";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function ChatInput() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    currentConversation,
    addNewConversation,
    invalidateMessagesCache,
    user,
  } = useChatContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  // Cleanup on conversation switch
  useEffect(() => {
    return () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
        setIsLoading(false);
      }
    };
  }, [currentConversation?._id]);

  const analyzeMessage = async (
    message: string,
    token: string,
    signal: AbortSignal
  ) => {
    try {
      const response = await fetch("/api/chat/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          userInfo: user?.userInfo || [],
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze message");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Analysis aborted");
      } else {
        console.error("Error analyzing message:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (isLoading) return;
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Create new abort controller for this request
    activeRequestRef.current = new AbortController();

    try {
      const messageResponse = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          conversationId: currentConversation?._id,
        }),
        signal: activeRequestRef.current.signal,
      });

      if (!messageResponse.ok) throw new Error("Failed to send message");

      const responseData = await messageResponse.json();
      if (responseData.newConversation) {
        addNewConversation(responseData.newConversation);
      }

      const streamResponse = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          conversationId:
            responseData.newConversation?._id || currentConversation?._id,
          userInfo: user?.userInfo || [],
        }),
        signal: activeRequestRef.current.signal,
      });

      if (!streamResponse.ok) throw new Error("Failed to stream response");

      const reader = streamResponse.body?.getReader();
      if (!reader) throw new Error("No reader available");

      // Clear the message input early to improve UX
      setMessage("");
      inputRef.current?.focus();

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        buffer += text;

        // Process complete messages
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              // Dispatch event with both message and userInfo
              const event = new CustomEvent("newMessage", {
                detail: {
                  content: JSON.stringify(data),
                  role: "assistant",
                  _id: Date.now().toString(),
                  createdAt: new Date().toISOString(),
                  conversationId:
                    responseData.newConversation?._id ||
                    currentConversation?._id ||
                    "",
                },
              });
              window.dispatchEvent(event);
            } catch (error) {
              console.error("Error parsing stream data:", error);
            }
          }
        }
      }

      // Invalidate the messages cache for this conversation
      invalidateMessagesCache(
        responseData.newConversation?._id || currentConversation?._id || ""
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Error sending message:", error);
      }
    } finally {
      activeRequestRef.current = null;
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full flex justify-center fixed bottom-20">
        <motion.form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-2 border-gray-300 py-2 px-3 rounded-2xl shadow-lg bg-white w-[40rem] max-w-[600px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
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
            disabled={isLoading || !message.trim()}
            className="hover:bg-gray-100 disabled:opacity-50 transition-all duration-300 relative"
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingScreen size="small" />
              </div>
            ) : (
              <ArrowRight className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
