import { Message } from "@/types/chat";
import ReactMarkdown, { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export default function MessageBlock({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div
      key={message._id}
      className={`flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`group relative max-w-[80%] rounded-lg px-4 py-2 ${
          message.role === "user"
            ? "bg-blue-500 text-white after:border-blue-500 after:right-[-8px] after:border-t-[8px] after:border-r-[8px] after:border-b-[8px] after:border-l-[8px] after:border-t-transparent after:border-r-transparent after:border-l-transparent"
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 after:border-gray-100 dark:after:border-gray-800 after:left-[-8px] after:border-t-[8px] after:border-r-[8px] after:border-b-[8px] after:border-l-[8px] after:border-t-transparent after:border-l-transparent after:border-b-transparent"
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
    </div>
  );
}
