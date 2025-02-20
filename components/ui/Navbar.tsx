"use client";

import { useChatContext } from "@/context/context";
import { useTheme } from "@/context/themeContext";
import { motion } from "framer-motion";
import Conversations from "./Conversations";
import UserInfo from "./UserInfo";
import { useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useChatContext();
  const { theme, toggleTheme } = useTheme();
  const [showUserInfo, setShowUserInfo] = useState(false);

  return (
    <>
      <div className="h-screen fixed left-6 flex flex-col justify-center gap-4 z-40">
        <motion.div
          className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <button
            onClick={() => setShowUserInfo(true)}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors w-32 overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {user?.name}
          </button>
          <button
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />
          <button
            onClick={logout}
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            Logout
          </button>
        </motion.div>
        <Conversations />
      </div>
      <UserInfo isOpen={showUserInfo} onClose={() => setShowUserInfo(false)} />
    </>
  );
}
