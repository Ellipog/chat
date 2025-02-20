import { Message, FileAttachment } from "@/types/chat";
import ReactMarkdown, { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import {
  Copy,
  Check,
  Download,
  FileIcon,
  ImageIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";

const getFileIcon = (contentType: string) => {
  if (contentType.startsWith("image/")) return ImageIcon;
  if (contentType === "application/pdf") return FileTextIcon;
  if (contentType === "text/csv") return FileSpreadsheetIcon;
  return FileIcon;
};

export default function MessageBlock({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const CodeBlock: Components["code"] = ({ className, children }) => {
    const match = /language-(\w+)/.exec(className || "");
    return match ? (
      <div className="rounded-lg overflow-hidden">
        <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div">
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code
        className={`${className} bg-gray-200 dark:bg-gray-700 rounded px-1`}
      >
        {children}
      </code>
    );
  };

  const renderAttachment = (attachment: FileAttachment) => {
    const isImage = attachment.contentType.startsWith("image/");
    const Icon = getFileIcon(attachment.contentType);

    if (isImage) {
      return (
        <div key={attachment._id} className="relative group">
          <Image
            src={attachment.url}
            alt={attachment.filename}
            width={100}
            height={100}
            className="max-w-full h-auto rounded-lg"
          />
          <button
            onClick={() => handleDownload(attachment.url, attachment.filename)}
            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <Download className="w-4 h-4 text-white" />
          </button>
        </div>
      );
    }

    return (
      <div
        key={attachment._id}
        className="h-10 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 group hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
      >
        <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="w-fit max-w-40 text-sm font-medium truncate">
            {attachment.filename}
          </span>
        </div>
        <button
          onClick={() => handleDownload(attachment.url, attachment.filename)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div
      key={message._id}
      className={`flex flex-col justify-center ${
        message.role === "user" ? "items-end" : "items-start"
      }`}
    >
      <div
        className={`group relative max-w-[80%] rounded-lg px-4 py-2 ${
          message.role === "user"
            ? "bg-blue-500 text-white after:border-blue-500 after:right-[-8px] after:border-t-[8px] after:border-r-[8px] after:border-b-[8px] after:border-l-[8px] after:border-t-transparent after:border-r-transparent after:border-l-transparent"
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
        } after:absolute after:bottom-[8px] after:block after:h-0 after:w-0 after:content-['']`}
      >
        {message.role === "assistant" && (
          <button
            onClick={handleCopy}
            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
            )}
          </button>
        )}
        <div className="prose dark:prose-invert max-w-none">
          <ReactMarkdown components={{ code: CodeBlock }}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-2 flex flex-row gap-2 flex-wrap -mx-2">
          {message.attachments.map(renderAttachment)}
        </div>
      )}
    </div>
  );
}
