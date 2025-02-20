import type { Metadata } from "next";
import "./globals.css";
import { ChatProvider } from "@/context/context";
import { ThemeProvider } from "@/context/themeContext";

export const metadata: Metadata = {
  title: "Chat",
  description: "AI chatbot by Elliot",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased bg-white dark:bg-gray-900 transition-colors duration-200`}
      >
        <ThemeProvider>
          <ChatProvider>{children}</ChatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
