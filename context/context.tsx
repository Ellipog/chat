"use client";

import { Conversation } from "@/components/ui/Conversations";
import { Message } from "@/types/chat";
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";

type MessageCache = { [conversationId: string]: Message[] };

interface UserInfo {
  info: string;
  category: string;
  createdAt: Date;
}

interface User {
  name: string;
  email: string;
  id: string;
  userInfo?: UserInfo[];
}

interface ChatContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  isLoading: boolean;
  user: User | null;
  setUser: (value: User | null) => void;
  updateUser: (value: User) => void;
  logout: () => void;
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;
  cachedConversations: Conversation[];
  setCachedConversations: (conversations: Conversation[]) => void;
  cachedMessages: MessageCache;
  setCachedMessages: Dispatch<SetStateAction<MessageCache>>;
  invalidateConversationsCache: () => void;
  invalidateMessagesCache: (conversationId: string) => void;
  addNewConversation: (conversation: Conversation) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [cachedConversations, setCachedConversations] = useState<
    Conversation[]
  >([]);
  const [cachedMessages, setCachedMessages] = useState<MessageCache>({});

  const checkConversations = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch("/api/chat/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setCurrentConversation(data.conversations[0]);
    } catch (error) {
      console.error("Error checking conversations:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      checkConversations();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await fetch("/api/auth/validate", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          if (data.success) {
            setUser(data.user);
            setIsLoggedIn(true);
          } else {
            logout();
          }
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const invalidateConversationsCache = () => {
    setCachedConversations([]);
  };

  const invalidateMessagesCache = (conversationId: string) => {
    setCachedMessages((prev) => {
      const newCache = { ...prev };
      delete newCache[conversationId];
      return newCache;
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsLoggedIn(false);
    setCurrentConversation(null);
    setCachedConversations([]);
    setCachedMessages({});
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const addNewConversation = (conversation: Conversation) => {
    setCachedConversations((prev) => [conversation, ...prev]);
    setCurrentConversation(conversation);
  };

  return (
    <ChatContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        isLoading,
        user,
        setUser,
        updateUser,
        logout,
        currentConversation,
        setCurrentConversation,
        cachedConversations,
        setCachedConversations,
        cachedMessages,
        setCachedMessages,
        invalidateConversationsCache,
        invalidateMessagesCache,
        addNewConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};
