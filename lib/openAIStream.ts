import type { ChatCompletionChunk } from "openai/resources/chat/completions";

interface AnalysisResult {
  category: string;
  info: string;
}

export function OpenAIStream(
  response: AsyncIterable<ChatCompletionChunk>,
  analysisResults: AnalysisResult[],
  onComplete?: (fullContent: string) => Promise<void>
) {
  const encoder = new TextEncoder();
  let buffer = "";
  let completeContent = "";
  let lastFlushTime = Date.now();
  const FLUSH_INTERVAL = 100; // Flush every 100ms
  let isComplete = false;

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
          if (isComplete) break;

          const content = chunk.choices[0]?.delta?.content || "";
          if (!content) continue;

          buffer += content;
          completeContent += content;
          const currentTime = Date.now();

          // Flush the buffer if it's been long enough or if we have a complete sentence
          if (
            currentTime - lastFlushTime >= FLUSH_INTERVAL ||
            content.match(/[.!?]\s*$/)
          ) {
            controller.enqueue(encoder.encode(buffer));
            lastFlushTime = currentTime;
            buffer = "";
          }
        }

        // Flush any remaining content
        if (buffer) {
          controller.enqueue(encoder.encode(buffer));
        }

        // Process complete response if callback provided
        if (onComplete && completeContent) {
          try {
            await onComplete(completeContent);
          } catch (error) {
            console.error("Error in completion callback:", error);
            // Don't throw here, as we still want to close the stream properly
          }
        }

        isComplete = true;
        controller.close();
      } catch (error) {
        console.error("Error in stream processing:", error);
        isComplete = true;
        controller.error(error);
      }
    },

    cancel() {
      // Clean up resources and mark as complete
      isComplete = true;
      buffer = "";
      completeContent = "";
    },
  });
}
