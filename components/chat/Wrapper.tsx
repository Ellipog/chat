"use client";

import ChatInput from "@/components/chat/Input";
import ChatMessages from "@/components/chat/Messages";

export default function ChatWrapper() {
  return (
    <div className="flex flex-col w-full h-screen">
      <ChatMessages />
      <ChatInput />
    </div>
  );
}
