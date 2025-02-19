import type { Metadata } from "next";
import "./globals.css";
import { ChatProvider } from "@/context/context";

export const metadata: Metadata = {
  title: "Chat",
  description: "AI chatbot by Elliot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <ChatProvider>{children}</ChatProvider>
      </body>
    </html>
  );
}
