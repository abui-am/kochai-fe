import * as React from "react";
import type { Route } from "./+types/chat";
import {
  queryKnowledgeBase,
  queryVanilla,
  checkOnboardingComplete,
  fetchUserProfile,
  type ContextItem,
  type QueryResponse,
  type VanillaQueryRequest,
} from "~/services/fitness-api";
import { marked } from "marked";
import { ProtectedRoute } from "~/components/protected-route";
import { useNavigate } from "react-router";
import { useAuth } from "~/contexts/auth-context";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  response?: QueryResponse; // Store full response for bot messages
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "KochAI" },
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
  const [expandedReferences, setExpandedReferences] = React.useState<
    Set<string>
  >(new Set());
  const [useVanillaMode, setUseVanillaMode] = React.useState<boolean>(false);
  const [onboardingCheckDone, setOnboardingCheckDone] =
    React.useState<boolean>(false);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  // Check if user needs to complete onboarding
  React.useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const isComplete = await checkOnboardingComplete();
        if (!isComplete) {
          // Double-check by fetching profile data directly
          const profileResponse = await fetchUserProfile();
          const { user, preferences } = profileResponse;

          // If user has provided required data, allow access even if status flags aren't set
          const hasRequiredData = !!(
            user.name &&
            user.name.trim().length > 0 &&
            preferences &&
            preferences.fitness_goals &&
            preferences.fitness_goals.length > 0 &&
            preferences.experience_level &&
            preferences.experience_level.trim().length > 0 &&
            preferences.workout_frequency &&
            preferences.workout_frequency.trim().length > 0
          );

          if (!hasRequiredData) {
            navigate("/onboarding");
            return;
          }
        }
      } catch (error) {
        // If check fails, redirect to onboarding for safety
        navigate("/onboarding");
        return;
      }
      setOnboardingCheckDone(true);
    };

    checkOnboarding();
  }, [navigate]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (listRef.current) {
      const scrollContainer = listRef.current;
      setTimeout(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }, 0);
    }
  }, [messages, isSending]);

  // Example chat prompts for users
  const examplePrompts = [
    "Berapa lama durasi latihan yang efektif persesi?",
    "Kenapa pegal-pegal setelah angkat beban terjadi?",
    "Berapa lama waktu tidur yang baik untuk membentuk otot?",
    "Gerakan apa yang harus dilakukan untuk membentuk otot?",
    "Berapa lama sampai saat saya melihat progres latihan saya?",

    "Kenapa latihan kaki itu penting?",
    "Cara mengobati pegal pegal setelah latihan",
    "Berapa banyak jumlah protein yang perlu dikonsumsi setiap hari?",
    "Kenapa saya harus latihan fisik untuk menjadi bugar?",
    "Kenapa seiring usia kemampuan fisik saya berkurang?",
  ];

  const handleSendMessage = async (message: string) => {
    const userMessage: ChatMessage = { role: "user", text: message };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      if (useVanillaMode) {
        // Use Vanilla LLM endpoint
        const vanillaRequest: VanillaQueryRequest = { text: message };
        const vanillaResponse = await queryVanilla(vanillaRequest);

        const botText =
          vanillaResponse?.answer ?? "Sorry, I could not generate a response.";

        // Convert vanilla response to QueryResponse-like structure for display
        const botMessage: ChatMessage = {
          role: "bot",
          text: botText,
          response: {
            answer: botText,
            sources: null,
            context: "",
            confidence: null,
            query: message,
            status: vanillaResponse?.status === "success",
            paperqa_session: {
              id: "",
              question: message,
              answer: botText,
              raw_answer: botText,
              answer_reasoning: null,
              has_successful_answer: true,
              context: "",
              contexts: [],
              references: "",
              formatted_answer: botText,
              graded_answer: null,
              cost: 0,
              token_counts: {},
              config_md5: "",
              tool_history: [],
              used_contexts: [],
            },
          },
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        // Use RAG endpoint
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
      }
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

  const toggleReferencesDropdown = (refId: string) => {
    setExpandedReferences((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(refId)) {
        newSet.delete(refId);
      } else {
        newSet.add(refId);
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
                {usedContexts.map((context, index) => {
                  const refId = `ref-${messageIndex}-used-${context.id}`;
                  const isRefExpanded = expandedReferences.has(refId);

                  return (
                    <div
                      key={context.id}
                      id={`ref-${messageIndex}-${index + 1}`}
                      className="border-l-2 border-blue-200 dark:border-blue-800 rounded-r-md overflow-hidden scroll-mt-20"
                    >
                      {/* Collapsible Title Header */}
                      <button
                        onClick={() => toggleReferencesDropdown(refId)}
                        className="w-full flex items-start justify-between p-1 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors text-left"
                        aria-expanded={isRefExpanded}
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs text-blue-600 dark:text-blue-400 flex-shrink-0">
                              [{index + 1}]
                            </span>
                            <span className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                              {context.text.doc.title}
                            </span>
                          </div>
                        </div>
                        <svg
                          className={`w-4 h-4 transition-transform flex-shrink-0 mt-0.5 text-gray-600 dark:text-gray-400`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{
                            transform: isRefExpanded
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {/* Collapsible Content */}
                      {isRefExpanded && (
                        <div className="px-3 py-3 bg-blue-50/30 dark:bg-blue-950/10 space-y-2 border-t border-blue-200 dark:border-blue-800">
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
                                Context: pp.{" "}
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
                          {context.text.doc.citation_count && (
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                              <div>
                                <span className="font-medium">
                                  Skor Relevansi:
                                </span>
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

                          {/* Context Content - Always Visible */}
                          <div className="mt-2 bg-white dark:bg-gray-800/50 rounded-md border border-blue-200 dark:border-blue-700 p-3">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Penggalan Konteks:
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                              {context.context}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Other Contexts - In dropdown */}
            {otherContexts.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() =>
                    toggleReferencesDropdown(
                      `ref-${messageIndex}-other-dropdown`
                    )
                  }
                  className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  aria-expanded={expandedReferences.has(
                    `ref-${messageIndex}-other-dropdown`
                  )}
                >
                  <span>Referensi Tambahan ({otherContexts.length})</span>
                  <svg
                    className={`w-3 h-3 transition-transform ${
                      expandedReferences.has(
                        `ref-${messageIndex}-other-dropdown`
                      )
                        ? "rotate-180"
                        : ""
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

                {expandedReferences.has(
                  `ref-${messageIndex}-other-dropdown`
                ) && (
                  <div className="space-y-3 pl-2">
                    {otherContexts.map((context, index) => {
                      const refId = `ref-${messageIndex}-other-${context.id}`;
                      const isRefExpanded = expandedReferences.has(refId);

                      return (
                        <div
                          key={context.id}
                          id={`ref-${messageIndex}-${
                            usedContexts.length + index + 1
                          }`}
                          className="border-l-2 border-gray-200 dark:border-gray-700 rounded-r-md overflow-hidden scroll-mt-20"
                        >
                          {/* Collapsible Title Header */}
                          <button
                            onClick={() => toggleReferencesDropdown(refId)}
                            className="w-full flex items-start justify-between p-3 bg-gray-50/50 dark:bg-gray-950/20 hover:bg-gray-100/50 dark:hover:bg-gray-900/30 transition-colors text-left"
                            aria-expanded={isRefExpanded}
                          >
                            <div className="flex-1 pr-3">
                              <div className="flex items-baseline gap-2">
                                <span className="font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">
                                  [{usedContexts.length + index + 1}]
                                </span>
                                <span className="font-semibold text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                  {context.text.doc.title}
                                </span>
                              </div>
                            </div>
                            <svg
                              className={`w-4 h-4 transition-transform flex-shrink-0 mt-0.5 text-gray-600 dark:text-gray-400`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              style={{
                                transform: isRefExpanded
                                  ? "rotate(180deg)"
                                  : "rotate(0deg)",
                              }}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          {/* Collapsible Content */}
                          {isRefExpanded && (
                            <div className="px-3 py-3 bg-gray-50/30 dark:bg-gray-950/10 space-y-2 border-t border-gray-200 dark:border-gray-700">
                              {/* Authors */}
                              {context.text.doc.authors &&
                                context.text.doc.authors.length > 0 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-500">
                                    <span className="font-medium">
                                      Penulis:
                                    </span>{" "}
                                    {context.text.doc.authors.join(", ")}
                                  </div>
                                )}

                              {/* Publication Details */}
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-medium">
                                  Diterbitkan:
                                </span>{" "}
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
                                    Skor Relevansi:
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
                                        Penerbit:
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

                              {/* Context Content - Always Visible */}
                              <div className="mt-2 bg-white dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 p-3">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Penggalan Konteks:
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                  {context.context}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Don't render chat until onboarding check is complete
  if (!onboardingCheckDone) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Memeriksa setup profile...
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col p-4 scroll-smooth relative">
        <section
          ref={listRef}
          aria-label="Chat conversation"
          className="mt-20 flex-1 space-y-3 overflow-y-auto rounded-md border border-gray-200 p-3 dark:border-gray-800"
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12 text-sm text-gray-500">
              <div className="text-center space-y-2">
                <p>Halo {user?.name}! 🤖💪</p>
                <p>
                  Selamat datang di KochAI, Saya Kochi sebagai pelatih virtual
                  kamu!
                </p>
                <p>Tanyakan apa saja tentang:</p>
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    Latihan
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    Kebugaran
                  </span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                    Kesehatan
                  </span>
                </div>
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
                <div className="space-x-3 flex">
                  {/* Funny Messages */}
                  <div className="animate-pulse text-gray-500 text-xs">
                    Sedang mencari jawaban, tunggu sebentar...
                  </div>
                  {/* Animated Dots for Visual Appeal */}
                  <div className="flex items-center justify-center gap-1">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-blue-500 [animation-delay:0ms]" />
                    <span className="h-1 w-1 animate-pulse rounded-full bg-blue-500 [animation-delay:150ms]" />
                    <span className="h-1 w-1 animate-pulse rounded-full bg-blue-500 [animation-delay:300ms]" />
                    <span className="ml-2 text-xs text-gray-400">💭</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Example Prompts */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 w-full text-center">
                Coba tanyakan:
              </div>
              {examplePrompts.slice(0, 6).map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(prompt)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full transition-colors border border-gray-200 dark:border-gray-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Mode Switcher */}
        <div className="flex py-8 items-center justify-center px-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {useVanillaMode ? "🤖 Vanilla LLM" : "📚 RAG Mode"}
            </span>
            <button
              type="button"
              onClick={() => setUseVanillaMode(!useVanillaMode)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Toggle between RAG and Vanilla LLM mode"
              aria-pressed={useVanillaMode}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  useVanillaMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {useVanillaMode ? "Tanpa Pencarian" : "Dengan Pencarian Ilmiah"}
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center border border-gray-200 gap-2  sticky bottom-6 left-0 right-0 p-4 bg-white rounded-full"
          aria-label="Form input pertanyaan"
        >
          <input
            value={inputValue}
            onChange={handleChange}
            placeholder="Ketik pertanyaan..."
            aria-label="Input pesan"
            className="flex-1 border-gray-200 bg-white px-3 py-2 text-sm outline-none ring-0 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-950"
          />
          <button
            type="submit"
            aria-label="kI"
            disabled={isSending || inputValue.trim().length === 0}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
