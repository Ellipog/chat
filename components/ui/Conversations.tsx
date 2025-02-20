"use client";

import { useEffect, useState, useRef } from "react";
import { useChatContext } from "@/context/context";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { motion } from "framer-motion";
import { Edit2, Trash2, Plus, Check, X, ArrowDown } from "lucide-react";
import TextInput from "@/components/ui/TextInput";
import ConfirmationModal from "@/components/ui/ConfirmationModal";

export interface Conversation {
  _id: string;
  title: string;
}

export default function Conversations() {
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(
    null
  );
  const {
    currentConversation,
    setCurrentConversation,
    cachedConversations,
    setCachedConversations,
    invalidateConversationsCache,
    setCachedMessages,
  } = useChatContext();
  const [showArrow, setShowArrow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/chat/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setCachedConversations(data.conversations || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cachedConversations.length === 0) {
      fetchConversations();
    }
  }, [cachedConversations.length]);

  useEffect(() => {
    const checkContentHeight = () => {
      if (contentRef.current) {
        const isOverflowing =
          contentRef.current.scrollHeight > contentRef.current.clientHeight;
        setShowArrow(isOverflowing);
      }
    };

    checkContentHeight();
    window.addEventListener("resize", checkContentHeight);

    return () => {
      window.removeEventListener("resize", checkContentHeight);
    };
  }, [cachedConversations]);

  const createNewConversation = () => {
    setCurrentConversation(null);
  };

  const handleUpdateTitle = async () => {
    if (!editingId) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`/api/chat/conversations/${editingId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editTitle,
        }),
      });

      if (!response.ok) throw new Error("Failed to update conversation");

      invalidateConversationsCache();
      if (currentConversation?._id === editingId) {
        setCurrentConversation({
          ...currentConversation,
          title: editTitle,
        });
      }
    } catch (error) {
      console.error("Error updating conversation:", error);
    } finally {
      setEditingId(null);
      setEditTitle("");
    }
  };

  const handleDeleteConversation = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`/api/chat/conversations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete conversation");

      invalidateConversationsCache();
      if (currentConversation?._id === id) {
        setCurrentConversation(null);
      }
      setCachedMessages((prev) => {
        const newCache = { ...prev };
        delete newCache[id];
        return newCache;
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
    } finally {
      setDeleteConfirmation(null);
    }
  };

  return (
    <motion.div
      className="max-h-96 flex flex-col gap-2 px-3 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-md relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {showArrow && (
        <div className="absolute bottom-3 right-3">
          <ArrowDown size={18} className="text-gray-500 dark:text-gray-400" />
        </div>
      )}
      <button
        onClick={createNewConversation}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
      >
        <Plus size={18} />
        <span>New Chat</span>
      </button>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <LoadingScreen size="small" />
        </div>
      ) : (
        <div
          ref={contentRef}
          className="space-y-2 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:hidden"
        >
          {cachedConversations.map((conversation) => (
            <div
              key={conversation._id}
              onClick={() => setCurrentConversation(conversation)}
              className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 group ${
                currentConversation?._id === conversation._id
                  ? "bg-gray-100 dark:bg-gray-700"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {editingId === conversation._id ? (
                <div className="flex-1 flex items-center gap-2">
                  <TextInput
                    value={editTitle}
                    onChange={(value) => setEditTitle(value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        handleUpdateTitle();
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                        setEditTitle("");
                      }
                    }}
                    autoFocus
                    minimal
                  />
                  <button
                    onClick={handleUpdateTitle}
                    className="text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditTitle("");
                    }}
                    className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <button className="flex-1 text-left text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors duration-200 truncate">
                    {conversation.title}
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(conversation._id);
                        setEditTitle(conversation.title);
                      }}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmation(conversation._id)}
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={() =>
          deleteConfirmation && handleDeleteConversation(deleteConfirmation)
        }
        title="Delete Conversation"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
      />
    </motion.div>
  );
}
