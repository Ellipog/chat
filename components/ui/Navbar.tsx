"use client";

import { useChatContext } from "@/context/context";
import { useTheme } from "@/context/themeContext";
import { motion, AnimatePresence } from "framer-motion";
import Conversations from "@/components/ui/Conversations";
import UserInfo from "@/components/ui/UserInfo";
import { useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useChatContext();
  const { theme, toggleTheme } = useTheme();
  const [showUserInfo, setShowUserInfo] = useState(false);

  return (
    <>
      <div className="h-screen fixed left-6 flex flex-col justify-center gap-4 z-40 w-64">
        <motion.div
          className="flex items-center gap-4 px-6 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-md"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <button
            onClick={() => setShowUserInfo(true)}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors w-28 overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {user?.name}
          </button>
          <button
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors relative w-5 h-5"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={theme}
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 180 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                {theme === "dark" ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </motion.div>
            </AnimatePresence>
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
