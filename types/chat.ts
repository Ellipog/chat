export interface Message {
  _id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: string;
  conversationId: string;
}

export interface Conversation {
  _id: string;
  title: string;
  user: string;
  lastMessageAt: string;
}

export interface MessageCache {
  [conversationId: string]: Message[];
}
