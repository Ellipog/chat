export interface FileAttachment {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
}

export interface MessageWithAttachments {
  content: string;
  role: "system" | "user" | "assistant";
  attachments?: FileAttachment[];
  name?: string;
}

export interface Message {
  _id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: string;
  conversationId: string;
  attachments?: FileAttachment[];
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
