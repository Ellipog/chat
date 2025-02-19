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

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
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
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  message: buffer,
                  userInfo: analysisResults,
                  isPartial: true,
                })}\n\n`
              )
            );

            lastFlushTime = currentTime;
            buffer = "";
          }
        }

        // Flush any remaining content
        if (buffer) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                message: buffer,
                userInfo: analysisResults,
                isPartial: false,
              })}\n\n`
            )
          );
        }

        // Signal completion
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              message: completeContent,
              userInfo: analysisResults,
              isComplete: true,
            })}\n\n`
          )
        );

        // Process complete response if callback provided
        if (onComplete && completeContent) {
          try {
            await onComplete(completeContent);
          } catch (error) {
            console.error("Error in completion callback:", error);
            throw error; // Re-throw to be caught by the outer try-catch
          }
        }

        controller.close();
      } catch (error) {
        console.error("Error in stream processing:", error);

        // Try to send error to client
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: "Stream processing failed",
                details:
                  error instanceof Error ? error.message : "Unknown error",
              })}\n\n`
            )
          );
        } catch {
          // If we can't send the error, just close the stream
        }

        controller.error(error);
      }
    },

    cancel() {
      // Clean up resources if needed
      buffer = "";
      completeContent = "";
    },
  });
}
