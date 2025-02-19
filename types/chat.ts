export interface Message {
  _id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: string;
  conversationId: string;
}

export interface AIResponse {
  message: string;
  userInfo?: {
    info: string;
    category: string;
  };
}
