"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import TextInput from "@/components/ui/TextInput";
import { useChatContext } from "@/context/context";
import LoadingScreen from "@/components/ui/LoadingScreen";

export default function Auth() {
  const { setIsLoggedIn, setUser } = useChatContext();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const endpoint = isRegistering ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (data.success) {
        setUser({
          name: data.user.name,
          email: data.user.email,
          id: data.user.id,
        });
        setIsLoggedIn(true);
        localStorage.setItem("token", data.token);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to authenticate. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4">
      <motion.div
        className="w-full max-w-md space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-center text-gray-800">
          {isRegistering ? "Create Account" : "Welcome Back"}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <TextInput
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleInputChange("name")}
                disabled={isLoading}
              />
            </motion.div>
          )}
          <TextInput
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleInputChange("email")}
            disabled={isLoading}
          />
          <TextInput
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange("password")}
            disabled={isLoading}
          />
          {error && (
            <motion.p
              className="text-red-500 text-sm text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {error}
            </motion.p>
          )}
          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 h-10 bg-gray-800 text-white rounded-2xl hover:bg-gray-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <LoadingScreen size="small" />
              </motion.div>
            ) : isRegistering ? (
              "Register"
            ) : (
              "Login"
            )}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            disabled={isLoading}
            className="w-full text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isRegistering
              ? "Already have an account? Login"
              : "Need an account? Register"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
