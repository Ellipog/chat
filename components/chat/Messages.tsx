"use client";

import { useChatContext } from "@/context/context";
import { useEffect, useState, useRef } from "react";
import MessageBlock from "@/components/chat/MessageBlock";
import { Message } from "@/types/chat";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { motion } from "framer-motion";

type MessageCache = { [conversationId: string]: Message[] };

export default function ChatMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const {
    currentConversation,
    cachedMessages,
    setCachedMessages,
    invalidateMessagesCache,
  } = useChatContext();

  const addOrUpdateMessage = (newMessage: Message) => {
    if (!currentConversation?._id) return;

    setCachedMessages((prevMessages: MessageCache): MessageCache => {
      const conversationMessages = prevMessages[currentConversation._id] || [];

      if (newMessage.role === "assistant") {
        const lastMessage =
          conversationMessages[conversationMessages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          const updatedMessages = [...conversationMessages];
          updatedMessages[conversationMessages.length - 1] = newMessage;
          return {
            ...prevMessages,
            [currentConversation._id]: updatedMessages,
          };
        }
      }

      return {
        ...prevMessages,
        [currentConversation._id]: [...conversationMessages, newMessage],
      };
    });
  };

  // Reset messages and fetch when conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      const token = localStorage.getItem("token");
      if (!token || !currentConversation?._id) {
        return;
      }

      // Check if we already have messages in cache
      if (cachedMessages[currentConversation._id]) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/chat/messages?conversationId=${currentConversation._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();
        setCachedMessages(
          (prev: MessageCache): MessageCache => ({
            ...prev,
            [currentConversation._id]: data.messages || [],
          })
        );
      } catch (error) {
        console.error("Error fetching messages:", error);
        invalidateMessagesCache(currentConversation._id);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [currentConversation?._id]);

  // Always scroll to bottom when conversation changes or messages are loaded
  useEffect(() => {
    if (!isLoading && currentConversation?._id) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [currentConversation?._id, isLoading, cachedMessages]);

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
  }, [cachedMessages, autoScroll]);

  // Listen for new messages from the Input component
  useEffect(() => {
    const handleNewMessage = ((e: CustomEvent<Message>) => {
      addOrUpdateMessage(e.detail);
    }) as EventListener;

    window.addEventListener("newMessage", handleNewMessage);
    return () => {
      window.removeEventListener("newMessage", handleNewMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversation?._id]);

  const currentMessages = currentConversation?._id
    ? cachedMessages[currentConversation._id] || []
    : [];

  return (
    <>
      <motion.div
        className="flex w-full justify-center items-center h-16 text-2xl font-bold text-gray-500 overflow-hidden mt-14 "
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {currentConversation?.title}
      </motion.div>
      <motion.div
        className="flex-1 w-full pb-40 overflow-hidden "
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {isLoading ? (
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
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />

            {/* Bottom fade gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />

            {/* Scrollable content */}
            <div className="h-full overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:hidden">
              <div className="max-w-3xl mx-auto space-y-4">
                {currentMessages.map((message) => (
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
