import * as React from "react";
import type { Route } from "./+types/chat";
import {
  queryKnowledgeBase,
  type ContextItem,
  type QueryResponse,
} from "~/services/fitness-api";
import { marked } from "marked";
import { ProtectedRoute } from "~/components/protected-route";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  response?: QueryResponse; // Store full response for bot messages
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Chatbot Fitness" },
    {
      name: "description",
      content: "Tanyakan pertanyaan fitness yang didukung oleh makalah ilmiah.",
    },
  ];
}

export default function Chat() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState<string>("");
  const [isSending, setIsSending] = React.useState<boolean>(false);
  const [loadingStep, setLoadingStep] = React.useState<number>(0);
  const [funnyMessage, setFunnyMessage] = React.useState<string>("");
  const [expandedReferences, setExpandedReferences] = React.useState<
    Set<number>
  >(new Set());
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // Example chat prompts for users
  const examplePrompts = [
    "Kenapa pegal-pegal setelah angkat beban terjadi?",
    "Berapa protein yang diperlukan untuk membangun otot?",
    "Berapa lama latihan yang efektif?",
    "Gerakan apa yang harus dilakukan untuk membentuk otot?",
    "Berapa banyak makanan yang harus dikonsumsi setelah latihan?",
    "Apa itu set dan repetisi?",
    "Berapa lama istirahat yang dibutuhkan antar set latihan?",
    "Kenapa saya harus latihan fisik?",
    "Kenapa seiring usia kemampuan fisik saya berkurang?",
    "Kenapa leg day itu penting?",
  ];

  React.useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  // Loading step progression effect
  React.useEffect(() => {
    if (!isSending) {
      setLoadingStep(0);
      setFunnyMessage("");
      return;
    }

    const funnyMessages = [
      "💪 Melatih otot otak saya...",
      "🏋️‍♀️ Mengangkat beban mental...",
      "🧠 Neuron saya sedang kardio...",
      "📚 Berkonsultasi dengan pelatih pribadi virtual...",
      "🔬 Mencampur sains dengan sedikit sihir...",
      "⚡ Mengisi baterai pengetahuan saya...",
      "🎯 Membidik jawaban yang sempurna...",
      "🌟 Menyalurkan guru fitness dalam diri saya...",
    ];

    const steps = [
      { step: 1, delay: 0, message: "Hmm, mari saya pikirkan..." },
      {
        step: 2,
        delay: 600,
        message: "Mencari di pengetahuan fitness saya...",
      },
      {
        step: 3,
        delay: 1000,
        message: "Hampir selesai, sedang memoles jawaban!",
      },
    ];

    // Set initial funny message
    setFunnyMessage(
      funnyMessages[Math.floor(Math.random() * funnyMessages.length)]
    );

    // Rotate funny messages every 400ms
    const messageInterval = setInterval(() => {
      setFunnyMessage(
        funnyMessages[Math.floor(Math.random() * funnyMessages.length)]
      );
    }, 400);

    steps.forEach(({ step, delay, message }) => {
      const timer = setTimeout(() => {
        setLoadingStep(step);
      }, delay);
      return () => clearTimeout(timer);
    });

    return () => {
      clearInterval(messageInterval);
    };
  }, [isSending]);

  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = { role: "user", text: message };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const response = await queryKnowledgeBase({
        question: message,
      });

      // Use the formatted answer from paperqa_session if available, otherwise fall back to answer
      const botText =
        response?.answer ?? "Sorry, I could not generate a response.";

      const botMessage: ChatMessage = {
        role: "bot",
        text: botText,
        response: response,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("API Error:", error);
      const botMessage: ChatMessage = {
        role: "bot",
        text: "Terjadi kesalahan saat menghubungi server. Silakan coba lagi.",
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event
  ) => {
    event.preventDefault();
    const message = inputValue.trim();
    if (!message || isSending) return;
    handleSendMessage(message);
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setInputValue(event.target.value);
  };

  const handleExampleClick = async (prompt: string) => {
    // Create a synthetic event to reuse handleSubmit logic
    setInputValue(prompt);
    handleSendMessage(prompt);
  };

  const toggleReferencesDropdown = (messageIndex: number) => {
    setExpandedReferences((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex);
      } else {
        newSet.add(messageIndex);
      }
      return newSet;
    });
  };

  const renderBotMessage = (message: ChatMessage, messageIndex: number) => {
    if (!message.response) {
      return (
        <p
          className="text-sm leading-relaxed [&>p]:mb-1 [&>h3]:text-xl [&>h3]:font-bold"
          dangerouslySetInnerHTML={{
            __html: parseMarkdownToHTML(message.text),
          }}
        />
      );
    }

    const { paperqa_session, confidence, status } = message.response;

    // Separate used contexts from other contexts
    const usedContextIds = new Set(paperqa_session?.used_contexts || []);
    const usedContexts =
      paperqa_session?.contexts?.filter((context) =>
        usedContextIds.has(context.id)
      ) || [];
    const otherContexts =
      paperqa_session?.contexts?.filter(
        (context) => !usedContextIds.has(context.id)
      ) || [];

    const isExpanded = expandedReferences.has(messageIndex);

    // Convert citation keys to numbers for better readability
    const processedAnswerText = convertCitationKeysToNumbers(
      message.text,
      paperqa_session?.contexts || [],
      paperqa_session?.used_contexts || [],
      messageIndex
    );

    return (
      <div className="space-y-4">
        {/* Main Answer */}
        <div
          className="text-sm leading-relaxed [&>p]:mb-2 [&>ol]:list-decimal [&>ol]:list-outside [&>ol]:ml-4 [&>ol>li]:mb-2 [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-2"
          dangerouslySetInnerHTML={{
            __html: parseMarkdownToHTML(processedAnswerText),
          }}
        />

        {/* Status and Confidence Indicator */}
        <div className="flex items-center gap-3 text-xs">
          {/* Confidence Indicator */}
          {confidence && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Tingkat Kepercayaan:
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  confidence === "very_high"
                    ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : confidence === "high"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : confidence === "medium"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {confidence === "very_high"
                  ? "Sangat Tinggi"
                  : confidence === "high"
                  ? "Tinggi"
                  : confidence === "medium"
                  ? "Sedang"
                  : "Rendah"}
              </span>
            </div>
          )}
        </div>

        {/* Scientific References */}
        {(usedContexts.length > 0 || otherContexts.length > 0) && (
          <div className="space-y-3">
            <h4
              id={`referensi-${messageIndex}`}
              className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide scroll-mt-20"
            >
              Referensi Ilmiah
            </h4>

            {/* Used Contexts - Always visible */}
            {usedContexts.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Referensi Utama ({usedContexts.length})
                </div>
                {usedContexts.map((context, index) => (
                  <div
                    key={context.id}
                    id={`ref-${messageIndex}-${index + 1}`}
                    className="border-l-2 border-blue-200 dark:border-blue-800 pl-3 py-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-md scroll-mt-20"
                  >
                    <div className="space-y-2">
                      {/* Reference Number and Title */}
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          [{index + 1}]
                        </span>
                        <span className="ml-2 font-semibold">
                          {context.text.doc.title}
                        </span>
                      </div>

                      {/* Authors */}
                      {context.text.doc.authors &&
                        context.text.doc.authors.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            <span className="font-medium">Penulis:</span>{" "}
                            {context.text.doc.authors.join(", ")}
                          </div>
                        )}

                      {/* Publication Details */}
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Diterbitkan:</span>{" "}
                        {context.text.doc.year}
                        {context.text.doc.journal && (
                          <span className="ml-2">
                            <span className="font-medium">di</span>{" "}
                            <em>{context.text.doc.journal}</em>
                          </span>
                        )}
                        {context.text.doc.volume && (
                          <span className="ml-1">
                            Vol. {context.text.doc.volume}
                          </span>
                        )}
                        {context.text.doc.issue && (
                          <span className="ml-1">
                            No. {context.text.doc.issue}
                          </span>
                        )}
                        {context.text.doc.pages && (
                          <span className="ml-1">
                            hlm. {context.text.doc.pages}
                          </span>
                        )}
                        {/* Show extracted page numbers from context name */}
                        {extractPageNumbers(context.text.name) && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium">
                            Context: pp. {extractPageNumbers(context.text.name)}
                          </span>
                        )}
                      </div>

                      {/* DOI and Links */}
                      {context.text.doc.doi && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">DOI:</span>
                          <a
                            href={context.text.doc.doi_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                          >
                            {context.text.doc.doi}
                          </a>
                        </div>
                      )}

                      {/* Citation Count and Quality */}
                      {context.text.doc.citation_count && (
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                          <div>
                            <span className="font-medium">Skor Relevansi:</span>
                            <span className="ml-1 font-semibold text-blue-600 dark:text-blue-400">
                              {context.score}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Kutipan:</span>
                            <span className="ml-1">
                              {context.text.doc.citation_count ?? 0}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Publisher and ISSN */}
                      {(context.text.doc.publisher ||
                        context.text.doc.issn) && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {context.text.doc.publisher && (
                            <span>
                              <span className="font-medium">Penerbit:</span>{" "}
                              {context.text.doc.publisher}
                            </span>
                          )}
                          {context.text.doc.issn && (
                            <span className="ml-4">
                              <span className="font-medium">ISSN:</span>{" "}
                              {context.text.doc.issn}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Context Content */}
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border-l-2 border-blue-200 dark:border-blue-700">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Konten Konteks:
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                          {context.context}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Other Contexts - In dropdown */}
            {otherContexts.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => toggleReferencesDropdown(messageIndex)}
                  className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  aria-expanded={isExpanded}
                >
                  <span>Referensi Tambahan ({otherContexts.length})</span>
                  <svg
                    className={`w-3 h-3 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="space-y-3 pl-2">
                    {otherContexts.map((context, index) => (
                      <div
                        key={context.id}
                        id={`ref-${messageIndex}-${
                          usedContexts.length + index + 1
                        }`}
                        className="border-l-2 border-gray-200 dark:border-gray-700 pl-3 py-3 bg-gray-50/50 dark:bg-gray-950/20 rounded-r-md scroll-mt-20"
                      >
                        <div className="space-y-2">
                          {/* Reference Number and Title */}
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-600 dark:text-gray-400">
                              [{usedContexts.length + index + 1}]
                            </span>
                            <span className="ml-2 font-semibold">
                              {context.text.doc.title}
                            </span>
                          </div>

                          {/* Authors */}
                          {context.text.doc.authors &&
                            context.text.doc.authors.length > 0 && (
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                <span className="font-medium">Penulis:</span>{" "}
                                {context.text.doc.authors.join(", ")}
                              </div>
                            )}

                          {/* Publication Details */}
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Diterbitkan:</span>{" "}
                            {context.text.doc.year}
                            {context.text.doc.journal && (
                              <span className="ml-2">
                                <span className="font-medium">di</span>{" "}
                                <em>{context.text.doc.journal}</em>
                              </span>
                            )}
                            {context.text.doc.volume && (
                              <span className="ml-1">
                                Vol. {context.text.doc.volume}
                              </span>
                            )}
                            {context.text.doc.issue && (
                              <span className="ml-1">
                                No. {context.text.doc.issue}
                              </span>
                            )}
                            {context.text.doc.pages && (
                              <span className="ml-1">
                                hlm. {context.text.doc.pages}
                              </span>
                            )}
                            {/* Show extracted page numbers from context name */}
                            {extractPageNumbers(context.text.name) && (
                              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 rounded text-xs font-medium">
                                Konteks: hlm.{" "}
                                {extractPageNumbers(context.text.name)}
                              </span>
                            )}
                          </div>

                          {/* DOI and Links */}
                          {context.text.doc.doi && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">DOI:</span>
                              <a
                                href={context.text.doc.doi_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                              >
                                {context.text.doc.doi}
                              </a>
                            </div>
                          )}

                          {/* Citation Count and Quality */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                            <div>
                              <span className="font-medium">
                                Relevance Score:
                              </span>
                              <span className="ml-1 font-semibold text-gray-600 dark:text-gray-400">
                                {context.score}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Kutipan:</span>
                              <span className="ml-1">
                                {context.text.doc.citation_count ?? 0}
                              </span>
                            </div>
                          </div>

                          {/* Publisher and ISSN */}
                          {(context.text.doc.publisher ||
                            context.text.doc.issn) && (
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              {context.text.doc.publisher && (
                                <span>
                                  <span className="font-medium">
                                    Publisher:
                                  </span>{" "}
                                  {context.text.doc.publisher}
                                </span>
                              )}
                              {context.text.doc.issn && (
                                <span className="ml-4">
                                  <span className="font-medium">ISSN:</span>{" "}
                                  {context.text.doc.issn}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Context Content */}
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border-l-2 border-gray-200 dark:border-gray-700">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Context Content:
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                              {context.context}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <main className="mx-auto flex h-dvh max-h-dvh w-full max-w-4xl flex-col p-4 scroll-smooth">
        <header className="flex items-center justify-between gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
          <h1 className="text-lg font-semibold">Chatbot Fitness</h1>
          <span className="text-xs text-gray-500">
            Didukung oleh makalah ilmiah
          </span>
        </header>

        <section
          ref={listRef}
          aria-label="Chat conversation"
          className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-md border border-gray-200 p-3 dark:border-gray-800"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              <div className="text-center space-y-2">
                <p>Selamat datang di Chatbot Fitness! 🤖💪</p>
                <p>Tanyakan apa saja tentang:</p>
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    Latihan
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    Nutrisi
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                    Pemulihan
                  </span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                    Kesehatan
                  </span>
                </div>
                <p className="text-xs mt-2">
                  Jawaban didukung oleh penelitian ilmiah terkini
                </p>
              </div>
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
                      : "max-w-[90%] rounded-2xl bg-gray-100 px-4 py-2 text-gray-900 dark:bg-gray-900 dark:text-gray-100"
                  }
                >
                  {message.role === "user" ? (
                    <p className="text-sm leading-relaxed">{message.text}</p>
                  ) : (
                    renderBotMessage(message, index)
                  )}
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-2xl bg-gray-100 px-4 py-3 text-gray-900 dark:bg-gray-900 dark:text-gray-100 flex gap-3">
                <div className="space-y-3">
                  {/* Funny Messages */}
                  {funnyMessage && (
                    <div className="flex items-center justify-center py-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                        {funnyMessage}
                      </div>
                    </div>
                  )}

                  {/* Animated Dots for Visual Appeal */}
                  <div className="flex items-center justify-center gap-1">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-blue-500 [animation-delay:0ms]" />
                    <span className="h-1 w-1 animate-pulse rounded-full bg-blue-500 [animation-delay:150ms]" />
                    <span className="h-1 w-1 animate-pulse rounded-full bg-blue-500 [animation-delay:300ms]" />
                    <span className="ml-2 text-xs text-gray-400">💭</span>
                    <span className="sr-only">Memproses permintaan Anda</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Example Chat Prompts */}
        {messages.length <= 1 && !isSending && (
          <div className="mt-3 mb-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Coba tanyakan:
            </div>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(prompt)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors border border-gray-200 dark:border-gray-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-3 flex items-center gap-2"
          aria-label="Message input form"
        >
          <input
            value={inputValue}
            onChange={handleChange}
            placeholder="Ketik pesan Anda..."
            aria-label="Input pesan"
            className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-950"
          />
          <button
            type="submit"
            aria-label="Kirim pesan"
            disabled={isSending || inputValue.trim().length === 0}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Kirim
          </button>
        </form>
      </main>
    </ProtectedRoute>
  );
}

function parseMarkdownToHTML(markdown: string) {
  return marked.parse(markdown);
}

// Function to convert citation keys to numbered references with anchor links
function convertCitationKeysToNumbers(
  answerText: string,
  contexts: ContextItem[],
  usedContextIds: string[],
  messageIndex: number
): string {
  // Create a mapping from citation keys to numbers and anchor IDs
  const citationKeyMap = new Map<
    string,
    { number: number; anchorId: string }
  >();

  // First, map used contexts to numbers 1, 2, 3, etc.
  const usedContextIdsSet = new Set(usedContextIds);
  let currentNumber = 1;

  // Process used contexts first
  contexts.forEach((context) => {
    if (usedContextIdsSet.has(context.id)) {
      const citationKey = context.id;
      const citationPattern = `${citationKey}`;
      const anchorId = `ref-${messageIndex}-${currentNumber}`;

      citationKeyMap.set(citationPattern, {
        number: currentNumber++,
        anchorId: anchorId,
      });
    }
  });

  // Then process remaining contexts
  contexts.forEach((context) => {
    if (!usedContextIdsSet.has(context.id)) {
      const citationKey = context.text.name;
      const citationPattern = `${citationKey}`;
      const anchorId = `ref-${messageIndex}-${currentNumber}`;

      citationKeyMap.set(citationPattern, {
        number: currentNumber++,
        anchorId: anchorId,
      });
    }
  });

  // Replace citation keys in answer text with clickable numbered references
  let result = answerText;
  citationKeyMap.forEach((citation, key) => {
    const regex = new RegExp(escapeRegExp(key), "g");
    const clickableCitation = `<a href="#${citation.anchorId}" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline font-medium">${citation.number}</a>`;
    result = result.replace(regex, clickableCitation);
  });

  return result;
}

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper function to extract page numbers from context name
function extractPageNumbers(contextName: string): string | null {
  const pageMatch = contextName.match(/pages (\d+-\d+)/);
  return pageMatch ? pageMatch[1] : null;
}
