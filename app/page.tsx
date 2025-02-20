"use client";

import ChatWrapper from "@/components/chat/Wrapper";
import { useChatContext } from "@/context/context";
import Navbar from "@/components/ui/Navbar";
import Auth from "@/components/auth/Auth";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function Home() {
  const { isLoggedIn, isLoading } = useChatContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingScreen />
      </div>
    );
  }

  return isLoggedIn ? (
    <div className="flex flex-col items-center justify-center h-screen">
      <Navbar />
      <ChatWrapper />
    </div>
  ) : (
    <Auth />
  );
}
