import { useEffect, useState } from "react";
import { useChatContext } from "@/context/context";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { motion } from "framer-motion";
import { Edit2, Trash2, Plus, Check, X } from "lucide-react";
import TextInput from "@/components/ui/TextInput";

export interface Conversation {
  _id: string;
  title: string;
}

export default function Conversations() {
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const {
    currentConversation,
    setCurrentConversation,
    cachedConversations,
    setCachedConversations,
    invalidateConversationsCache,
  } = useChatContext();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedConversations.length]);

  const selectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
  };

  const startEditing = (conversation: Conversation) => {
    setEditingId(conversation._id);
    setEditTitle(conversation.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`/api/chat/conversations/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: editTitle }),
      });

      if (response.ok) {
        invalidateConversationsCache();
        await fetchConversations();
      }
    } catch (error) {
      console.error("Error updating conversation:", error);
    }

    cancelEditing();
  };

  const deleteConversation = async (id: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`/api/chat/conversations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        if (currentConversation?._id === id) {
          setCurrentConversation(null);
        }
        setCachedConversations(
          cachedConversations.filter((conv) => conv._id !== id)
        );
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const createNewConversation = () => {
    setCurrentConversation(null);
  };

  if (isLoading) {
    return (
      <motion.div
        className="fixed top-4 left-4 w-64 bg-white rounded-2xl shadow-lg p-4 flex items-center justify-center"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <LoadingScreen />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-64 bg-white rounded-2xl shadow-lg max-h-[24rem] overflow-y-auto flex flex-col gap-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="p-4 border-b border-gray-100">
        <motion.button
          className="w-full py-2 px-4 bg-gray-800 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors"
          onClick={createNewConversation}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          New Chat
        </motion.button>
      </div>
      <div className="p-2 max-h-[calc(100vh-8rem)] overflow-y-auto flex flex-col gap-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
        {cachedConversations.map((conversation) => (
          <motion.div
            key={conversation._id}
            onClick={(e) => {
              e.preventDefault();
              if (editingId === conversation._id) return;
              selectConversation(conversation);
            }}
            className={`p-3 rounded-xl text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors relative group ${
              currentConversation?._id === conversation._id
                ? "bg-gray-200/70"
                : ""
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {editingId === conversation._id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  saveEdit();
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2"
              >
                <TextInput
                  value={editTitle}
                  onChange={setEditTitle}
                  placeholder="Conversation name"
                  minimal
                  // @ts-expect-error dumb typescript
                  onBlur={(e) => {
                    e.stopPropagation();
                    cancelEditing();
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-1 hover:bg-gray-100 rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Check className="w-4 h-4 text-green-500" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelEditing();
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </form>
            ) : (
              <>
                <div className="pr-16 truncate select-none">
                  {conversation.title}
                </div>
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(conversation);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation._id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
