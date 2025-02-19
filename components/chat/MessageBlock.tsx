import { Message } from "@/types/chat";
import ReactMarkdown from "react-markdown";
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
            : "bg-gray-100 text-gray-800 after:border-gray-100 after:left-[-8px] after:border-t-[8px] after:border-r-[8px] after:border-b-[8px] after:border-l-[8px] after:border-t-transparent after:border-l-transparent after:border-b-transparent"
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
              <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
            )}
          </button>
        )}
        <div>
          {message.role === "assistant" ? (
            <Markdown content={message.content} />
          ) : (
            message.content
          )}
        </div>
      </div>
    </div>
  );
}
function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        code({
          inline,
          className,
          children,
          ...props
        }: {
          inline?: boolean;
          className?: string;
          children?: React.ReactNode;
        }) {
          const match = /language-(\w+)/.exec(className || "");
          return !inline && match ? (
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              className="rounded-md"
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code className="bg-gray-200 rounded px-1 py-0.5" {...props}>
              {children}
            </code>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc ml-4 mb-2">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal ml-4 mb-2">{children}</ol>;
        },
        li({ children }) {
          return <li className="mb-1">{children}</li>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic">
              {children}
            </blockquote>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
