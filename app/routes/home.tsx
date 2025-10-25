import React from "react";
import type { Route } from "./+types/home";
import { useAuth } from "~/contexts/auth-context";
import { useNavigate } from "react-router";
import { checkOnboardingComplete } from "~/services/fitness-api";
import logoDark from "../welcome/logo-dark.svg";
import logoLight from "../welcome/logo-light.svg";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fitness Chatbot - AI-Powered Fitness Knowledge" },
    {
      name: "description",
      content:
        "Chatbot fitness cerdas yang didukung oleh penelitian ilmiah dan PaperQA",
    },
  ];
}

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [onboardingCheckDone, setOnboardingCheckDone] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      const checkAndRedirect = async () => {
        try {
          const isComplete = await checkOnboardingComplete();
          if (isComplete) {
            navigate("/chat");
          } else {
            navigate("/onboarding");
          }
        } catch (error) {
          // If check fails, redirect to onboarding for safety
          navigate("/onboarding");
        }
        setOnboardingCheckDone(true);
      };

      checkAndRedirect();
    }
  }, [isAuthenticated, navigate]);

  if (isLoading || (isAuthenticated && !onboardingCheckDone)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to chat or onboarding
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex items-center justify-center pt-16 pb-4">
        <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
          <header className="flex flex-col items-center gap-9">
            <div className="w-[500px] max-w-[100vw] p-4">
              <img
                src={logoLight}
                alt="Fitness Chatbot"
                className="block w-full dark:hidden"
              />
              <img
                src={logoDark}
                alt="Fitness Chatbot"
                className="hidden w-full dark:block"
              />
            </div>

            <div className="text-center space-y-6">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                💪 Fitness Chatbot
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                AI-powered fitness knowledge base yang didukung oleh penelitian
                ilmiah. Dapatkan jawaban akurat dari ribuan makalah ilmiah
                tentang fitness dan kesehatan.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => navigate("/login")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
                >
                  Mulai Chat Sekarang
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium py-3 px-8 rounded-lg border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Pelajari Lebih Lanjut
                </button>
              </div>
            </div>
          </header>

          <div className="max-w-4xl w-full px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🧠</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  AI-Powered
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Teknologi GPT-4 dan PaperQA untuk analisis dokumen ilmiah
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📚</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Sumber Terpercaya
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Semua informasi disertai dengan sitasi dari penelitian ilmiah
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Personalisasi
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Sesuaikan dengan tujuan fitness dan tingkat pengalaman Anda
                </p>
              </div>
            </div>
          </div>

          <div className="text-center pb-8">
            <p className="text-gray-600 dark:text-gray-400">
              Bergabunglah dengan ribuan orang yang sudah mendapatkan jawaban
              fitness akurat dan terpercaya
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
