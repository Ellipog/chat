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
  const { currentConversation, addNewConversation, invalidateMessagesCache } =
    useChatContext();
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

    const tempId = `temp-${Date.now()}`;
    // Immediately add user message to UI
    const userMessage = {
      _id: tempId,
      content: message,
      role: "user" as const,
      createdAt: new Date().toISOString(),
      conversationId: currentConversation?._id || "",
    };
    window.dispatchEvent(
      new CustomEvent("newMessage", { detail: userMessage })
    );

    // Clear the message input early to improve UX
    const currentMessage = message;
    setMessage("");
    inputRef.current?.focus();

    try {
      await fetch("/api/chat/analyze", {
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
      });

      const messageResponse = await fetch("/api/chat/message", {
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
      });

      if (!messageResponse.ok) {
        const error = await messageResponse.json();
        throw new Error(error.error || "Failed to send message");
      }

      // Handle new conversation creation
      let conversationId = currentConversation?._id;
      if (!conversationId) {
        const responseData = await messageResponse.json();
        if (responseData.newConversation) {
          addNewConversation(responseData.newConversation);
          conversationId = responseData.newConversation._id;
        }
      }

      // Handle streaming for all conversations
      if (!messageResponse.body) {
        throw new Error("No response body received");
      }

      await handleStreamingResponse(
        messageResponse.body,
        conversationId || "",
        tempId
      );

      // Invalidate the messages cache for this conversation after streaming is complete
      if (conversationId) {
        invalidateMessagesCache(conversationId);
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

    // Create a temporary message for streaming
    const tempAssistantMessage = {
      _id: `temp-assistant-${Date.now()}`,
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
              <LoadingScreen size="small" />
            ) : (
              <ArrowRight className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
