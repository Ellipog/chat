"use client";

import { useChatContext } from "@/context/context";
import { useEffect, useState, useRef } from "react";
import MessageBlock from "@/components/chat/MessageBlock";
import { Message } from "@/types/chat";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { motion } from "framer-motion";

export default function ChatMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const previousConversationId = useRef<string | null>(null);

  const { currentConversation, cachedMessages, setCachedMessages } =
    useChatContext();

  const addOrUpdateMessage = (newMessage: Message) => {
    if (!currentConversation?._id) return;

    setLocalMessages((prevMessages) => {
      // For temporary AI messages, only update the specific message with matching ID
      if (newMessage._id.startsWith("temp-assistant-")) {
        const existingTempIndex = prevMessages.findIndex(
          (msg) => msg._id === newMessage._id
        );
        if (existingTempIndex !== -1) {
          return prevMessages.map((msg, index) =>
            index === existingTempIndex ? newMessage : msg
          );
        }
      }

      // For regular message updates
      const existingIndex = prevMessages.findIndex(
        (msg) => msg._id === newMessage._id
      );

      if (existingIndex !== -1) {
        return prevMessages.map((msg, index) =>
          index === existingIndex ? newMessage : msg
        );
      }

      return [...prevMessages, newMessage];
    });
  };

  // Update cache when local messages change
  useEffect(() => {
    if (currentConversation?._id && localMessages.length > 0) {
      // Include all messages in cache, including temporary ones
      setCachedMessages((prevCache) => ({
        ...prevCache,
        [currentConversation._id]: localMessages,
      }));
    }
  }, [localMessages, currentConversation?._id, setCachedMessages]);

  // Initialize or update local messages when conversation changes
  useEffect(() => {
    if (!currentConversation?._id) {
      setLocalMessages([]);
      return;
    }

    // Clear messages immediately when switching conversations
    setLocalMessages([]);

    // If we have cached messages for this conversation, use them
    if (cachedMessages[currentConversation._id]?.length > 0) {
      setLocalMessages(cachedMessages[currentConversation._id]);
      return;
    }

    // If conversation changed, fetch messages
    if (currentConversation._id !== previousConversationId.current) {
      const fetchMessages = async () => {
        setIsLoading(true);
        try {
          const token = localStorage.getItem("token");
          if (!token) return;

          const response = await fetch(
            `/api/chat/messages?conversationId=${currentConversation._id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error("Failed to fetch messages");
          }

          const data = await response.json();
          const fetchedMessages = data.messages || [];

          setLocalMessages(fetchedMessages);
          setCachedMessages((prev) => ({
            ...prev,
            [currentConversation._id]: fetchedMessages.filter(
              (msg: Message) => !msg._id.startsWith("temp-")
            ),
          }));
        } catch (error) {
          console.error("Error fetching messages:", error);
          // Clear local messages on error to prevent stale state
          setLocalMessages([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchMessages();
    }

    previousConversationId.current = currentConversation._id;
  }, [currentConversation?._id]);

  // Handle scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages, autoScroll]);

  // Listen for new messages from the Input component
  useEffect(() => {
    const handleNewMessage = ((e: CustomEvent<Message>) => {
      addOrUpdateMessage(e.detail);
    }) as EventListener;

    const handleUpdateMessage = ((e: CustomEvent<Message>) => {
      addOrUpdateMessage(e.detail);
    }) as EventListener;

    const handleRemoveMessage = ((
      e: CustomEvent<{ id: string; userMessageId?: string }>
    ) => {
      if (!currentConversation?._id) return;

      setLocalMessages((prevMessages) => {
        return prevMessages.filter((msg) => {
          if (e.detail.userMessageId) {
            return (
              msg._id !== e.detail.id && msg._id !== e.detail.userMessageId
            );
          }
          return msg._id !== e.detail.id;
        });
      });
    }) as EventListener;

    window.addEventListener("newMessage", handleNewMessage);
    window.addEventListener("updateMessage", handleUpdateMessage);
    window.addEventListener("removeMessage", handleRemoveMessage);

    return () => {
      window.removeEventListener("newMessage", handleNewMessage);
      window.removeEventListener("updateMessage", handleUpdateMessage);
      window.removeEventListener("removeMessage", handleRemoveMessage);
    };
  }, [currentConversation?._id]);

  return (
    <>
      <motion.div
        className="flex w-full justify-center items-center h-16 text-2xl font-bold text-gray-500 dark:text-gray-400 overflow-hidden mt-14"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {currentConversation?.title}
      </motion.div>
      <motion.div
        className="flex-1 w-full pb-40 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {isLoading && !localMessages.length ? (
          <motion.div
            className="h-full flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <LoadingScreen />
          </motion.div>
        ) : (
          <motion.div
            ref={scrollContainerRef}
            className="relative h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {/* Top fade gradient */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />

            {/* Bottom fade gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />

            {/* Scrollable content */}
            <div className="h-full overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:hidden">
              <div className="max-w-3xl mx-auto space-y-4">
                {localMessages.map((message) => (
                  <motion.div
                    key={message._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="mt-2"
                  >
                    <MessageBlock message={message} />
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
