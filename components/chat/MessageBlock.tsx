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
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import * as pdfjs from "pdfjs-dist";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

const getFileIcon = (contentType: string, url: string, filename: string) => {
  if (contentType.startsWith("image/"))
    return (
      <Image
        src={url}
        alt={filename}
        width={4}
        height={4}
        unoptimized
        className="w-6 h-6 rounded"
      />
    );
  if (contentType === "application/pdf") return <FileTextIcon />;
  if (contentType === "text/csv") return <FileSpreadsheetIcon />;
  return <FileIcon />;
};

interface ImageData {
  url: string;
  filename: string;
}

export default function MessageBlock({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileAttachment | null>(null);
  const [pdfImages, setPdfImages] = useState<ImageData[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (selectedFile && !target.closest(".modal-content")) {
        handleCloseModal();
      }
    };

    if (selectedFile) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedFile]);

  const handleCloseModal = () => {
    setSelectedFile(null);
    setPdfImages([]);
    setCurrentPage(0);
  };

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

  const convertPDFToImages = async (url: string, filename: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const images: ImageData[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context!,
          viewport: viewport,
        }).promise;

        const imageUrl = canvas.toDataURL("image/png");
        images.push({
          url: imageUrl,
          filename: `${filename.replace(/\.pdf$/, "")}_page_${pageNum}.png`,
        });
      }

      setPdfImages(images);
    } catch (error) {
      console.error("Error converting PDF:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = async (attachment: FileAttachment) => {
    setSelectedFile(attachment);
    if (attachment.contentType === "application/pdf") {
      await convertPDFToImages(attachment.url, attachment.filename);
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
    const isPdf = attachment.contentType === "application/pdf";
    const IconElement = getFileIcon(
      attachment.contentType,
      attachment.url,
      attachment.filename
    );

    return (
      <div
        key={attachment._id}
        className="h-10 w-fit max-w-60 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 group hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
      >
        {IconElement}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-medium truncate">
            {attachment.filename}
          </span>
        </div>
        <div className="flex gap-2">
          {(isImage || isPdf) && (
            <button
              onClick={() => handleFileClick(attachment)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleDownload(attachment.url, attachment.filename)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!selectedFile) return null;

    const isImage = selectedFile.contentType.startsWith("image/");
    const isPdf = selectedFile.contentType === "application/pdf";
    const showNavigation = isPdf && pdfImages.length > 1;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="modal-content relative max-w-[90vw] max-h-[90vh]">
          <button
            onClick={handleCloseModal}
            className="absolute -top-10 right-0 text-white hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : (
            <>
              {isImage && (
                <Image
                  src={selectedFile.url}
                  alt={selectedFile.filename}
                  width={800}
                  height={600}
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  unoptimized
                />
              )}
              {isPdf && pdfImages.length > 0 && (
                <div className="relative">
                  <Image
                    src={pdfImages[currentPage].url}
                    alt={pdfImages[currentPage].filename}
                    width={800}
                    height={1000}
                    className="max-w-full max-h-[90vh] object-contain rounded-lg bg-white"
                    unoptimized
                  />
                  {showNavigation && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/50 text-white px-4 py-2 rounded-full">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(0, prev - 1))
                        }
                        disabled={currentPage === 0}
                        className="disabled:opacity-50"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm">
                        {currentPage + 1} / {pdfImages.length}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(pdfImages.length - 1, prev + 1)
                          )
                        }
                        disabled={currentPage === pdfImages.length - 1}
                        className="disabled:opacity-50"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
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
          <div className="mt-2 flex flex-row flex-wrap gap-2 w-full justify-end">
            {message.attachments.map(renderAttachment)}
          </div>
        )}
      </div>

      {renderModal()}
    </>
  );
}
