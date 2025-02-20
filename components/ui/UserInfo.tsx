"use client";

import { useChatContext } from "@/context/context";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { XCircle } from "lucide-react";

interface UserInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserInfo({ isOpen, onClose }: UserInfoProps) {
  const { user, updateUser } = useChatContext();
  const [loading, setLoading] = useState(false);

  const handleRemoveInfo = async (index: number) => {
    if (!user) return;
    setLoading(true);
    try {
      if (!user?.userInfo) return;
      const updatedInfo = user.userInfo.filter((_, i) => i !== index);
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          updates: { userInfo: updatedInfo },
        }),
      });

      if (!response.ok) throw new Error("Failed to update user info");

      const updatedUser = { ...user, userInfo: updatedInfo };
      updateUser(updatedUser);
    } catch (error) {
      console.error("Error removing info:", error);
    } finally {
      setLoading(false);
    }
  };

  console.log(user?.userInfo);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold select-none">
                User Information
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle size={24} />
              </button>
            </div>

            {user?.userInfo && user.userInfo.length > 0 ? (
              <div className="flex flex-row flex-wrap gap-2">
                {user.userInfo.map((info, index) => (
                  <div
                    key={index}
                    onClick={() => handleRemoveInfo(index)}
                    className="bg-gray-100 hover:bg-gray-200 h-8 transition-all duration-200 w-fit gap-2 p-2 rounded-lg flex justify-between items-center group hover:animate-wiggle"
                  >
                    <div>
                      <p className="text-gray-800 select-none">{info.info}</p>
                    </div>
                    <button
                      disabled={loading}
                      className="text-red-400 group-hover:text-red-700 disabled:opacity-50 transition-all duration-200"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No information gathered yet
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
