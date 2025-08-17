import * as React from "react";
import type { Route } from "./+types/chat";
import { queryKnowledgeBase } from "~/services/fitness-api";
import { marked } from "marked";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fitness Chatbot" },
    {
      name: "description",
      content: "Ask fitness questions backed by scientific papers.",
    },
  ];
}

export default function Chat() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState<string>("");
  const [isSending, setIsSending] = React.useState<boolean>(false);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const response = await queryKnowledgeBase({ question: trimmed });
      const botText =
        response?.answer ?? "Sorry, I could not generate a response.";
      const botMessage: ChatMessage = { role: "bot", text: botText };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const botMessage: ChatMessage = {
        role: "bot",
        text: "There was an error contacting the server. Please try again.",
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setInputValue(event.target.value);
  };

  return (
    <main className="mx-auto flex h-dvh max-h-dvh w-full max-w-3xl flex-col p-4">
      <header className="flex items-center justify-between gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
        <h1 className="text-lg font-semibold">Fitness Chatbot</h1>
        <span className="text-xs text-gray-500">
          Powered by scientific papers
        </span>
      </header>

      <section
        ref={listRef}
        aria-label="Chat conversation"
        className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-md border border-gray-200 p-3 dark:border-gray-800"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Ask anything about training, nutrition, or recovery.
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-[80%] rounded-2xl bg-blue-600 px-4 py-2 text-white"
                    : "max-w-[80%] rounded-2xl bg-gray-100 px-4 py-2 text-gray-900 dark:bg-gray-900 dark:text-gray-100"
                }
              >
                <p
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html:
                      message.role === "user"
                        ? message.text
                        : parseMarkdownToHTML(message.text),
                  }}
                />
              </div>
            </div>
          ))
        )}

        {isSending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-4 py-2 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
              <span className="h-1 w-1 animate-pulse rounded-full bg-gray-500 [animation-delay:0ms]" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-gray-500 [animation-delay:150ms]" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-gray-500 [animation-delay:300ms]" />
              <span className="sr-only">Bot is typing</span>
            </div>
          </div>
        )}
      </section>

      <form
        onSubmit={handleSubmit}
        className="mt-3 flex items-center gap-2"
        aria-label="Message input form"
      >
        <input
          value={inputValue}
          onChange={handleChange}
          placeholder="Type your message..."
          aria-label="Message input"
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-950"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={isSending || inputValue.trim().length === 0}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}

export function parseMarkdownToHTML(markdown: string) {
  return marked.parse(markdown);
}
