import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "~/contexts/auth-context";
import {
  updateUserProfile,
  updateUserPreferences,
  type UserProfileUpdate,
  type UserPreferences,
} from "~/services/fitness-api";

interface OnboardingStep {
  id: "profile" | "preferences" | "complete";
  title: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    id: "profile",
    title: "Informasi Pribadi",
    description:
      "Lengkapi informasi profile Anda untuk pengalaman yang lebih personal",
  },
  {
    id: "preferences",
    title: "Preferensi Fitness",
    description: "Beritahu kami tentang tujuan dan preferensi fitness Anda",
  },
  {
    id: "complete",
    title: "Selesai!",
    description: "Profile Anda sudah siap. Mari mulai chat dengan AI fitness!",
  },
];

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] =
    useState<OnboardingStep["id"]>("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [profileData, setProfileData] = useState<UserProfileUpdate>({
    bio: "",
  });

  const [preferencesData, setPreferencesData] = useState<UserPreferences>({
    fitness_goals: [],
    experience_level: "",
    preferred_workout_types: [],
    workout_frequency: "",
    available_equipment: [],
    dietary_restrictions: [],
    notifications_enabled: true,
    email_updates: true,
    language: "id",
  });

  // Raw input values for better UX (don't process on every keystroke)
  const [rawInputs, setRawInputs] = useState({
    available_equipment: "",
    dietary_restrictions: "",
  });

  // Initialize raw inputs when component mounts or when preferences change
  React.useEffect(() => {
    setRawInputs({
      available_equipment: preferencesData.available_equipment?.[0] || "", // Take first element as single string
      dietary_restrictions: preferencesData.dietary_restrictions?.[0] || "", // Take first element as single string
    });
  }, [
    preferencesData.available_equipment,
    preferencesData.dietary_restrictions,
  ]);

  // Also initialize when the step changes to preferences
  React.useEffect(() => {
    if (currentStep === "preferences") {
      setRawInputs({
        available_equipment: preferencesData.available_equipment?.[0] || "", // Take first element as single string
        dietary_restrictions: preferencesData.dietary_restrictions?.[0] || "", // Take first element as single string
      });
    }
  }, [
    currentStep,
    preferencesData.available_equipment,
    preferencesData.dietary_restrictions,
  ]);

  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await updateUserProfile(profileData);
      await refreshUser();
      setCurrentStep("preferences");
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await updateUserPreferences(preferencesData);
      await refreshUser();
      setCurrentStep("complete");
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan preferensi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    // Refresh user data to ensure onboarding completion is reflected
    await refreshUser();
    navigate("/chat");
  };

  const handleProfileChange =
    (field: keyof UserProfileUpdate) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProfileData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handlePreferenceChange =
    (field: keyof UserPreferences) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const inputValue = e.target.value;

      // Update raw inputs for text fields
      if (field === "available_equipment" || field === "dietary_restrictions") {
        setRawInputs((prev) => ({ ...prev, [field]: inputValue }));

        // For both equipment and dietary restrictions, treat as single string (no comma splitting)
        setPreferencesData((prev) => ({
          ...prev,
          [field]: inputValue ? [inputValue] : [],
        }));
      } else {
        // For select elements, update preferencesData directly
        if (field === "fitness_goals") {
          // fitness_goals is an array, but UI treats it as single selection
          const newValue = inputValue ? [inputValue] : [];
          setPreferencesData((prev) => ({
            ...prev,
            [field]: newValue,
          }));
        } else {
          // For other select fields (experience_level, workout_frequency)
          setPreferencesData((prev) => ({
            ...prev,
            [field]: inputValue || "",
          }));
        }
      }
    };

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Selamat Datang di KochAI!
              </h1>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {currentStepIndex + 1} dari {steps.length}
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {steps[currentStepIndex]?.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {steps[currentStepIndex]?.description}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Profile Step */}
          {currentStep === "profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Halo {user?.name}! Mari lengkapi informasi Anda untuk
                  pengalaman yang lebih baik.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio (Opsional)
                </label>
                <textarea
                  value={profileData.bio || ""}
                  onChange={handleProfileChange("bio")}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Ceritakan tentang diri Anda..."
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                {isLoading ? "Menyimpan..." : "Lanjutkan ke Preferensi"}
              </button>
            </form>
          )}

          {/* Preferences Step */}
          {currentStep === "preferences" && (
            <form onSubmit={handlePreferencesSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-gray-600 dark:text-gray-400">
                  Beritahu kami tentang tujuan fitness Anda agar AI dapat
                  memberikan saran yang lebih tepat.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tujuan Fitness *
                </label>
                <select
                  value={preferencesData.fitness_goals?.join(", ") || ""}
                  onChange={handlePreferenceChange("fitness_goals")}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                >
                  <option value="">Pilih tujuan utama...</option>
                  <option value="body_building">Membangun badan</option>
                  <option value="muscle_gain">Membangun otot</option>
                  <option value="weight_loss">Menurunkan berat badan</option>
                  <option value="strength">Meningkatkan kekuatan</option>
                  <option value="endurance">Meningkatkan daya tahan</option>
                  <option value="flexibility">
                    Meningkatkan fleksibilitas
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tingkat Pengalaman *
                </label>
                <select
                  value={preferencesData.experience_level || ""}
                  onChange={handlePreferenceChange("experience_level")}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                >
                  <option value="">Pilih tingkat pengalaman...</option>
                  <option value="never">Tidak Pernah</option>
                  <option value="beginner">Pemula</option>
                  <option value="intermediate">Menengah</option>
                  <option value="advanced">Lanjutan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frekuensi Latihan *
                </label>
                <select
                  value={preferencesData.workout_frequency || ""}
                  onChange={handlePreferenceChange("workout_frequency")}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  required
                >
                  <option value="">Pilih frekuensi...</option>
                  <option value="less_than_once_weekly">
                    Kurang dari 1x per minggu
                  </option>
                  <option value="1-2_times_per_week">
                    1-2 kali per minggu
                  </option>
                  <option value="3-4_times_per_week">
                    3-4 kali per minggu
                  </option>
                  <option value="5-6_times_per_week">
                    5-6 kali per minggu
                  </option>
                  <option value="daily">Setiap hari</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alat yang Tersedia (Opsional)
                </label>
                <input
                  type="text"
                  value={rawInputs.available_equipment}
                  onChange={handlePreferenceChange("available_equipment")}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Contoh: Dumbbell atau treadmill"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pembatasan Diet (Opsional)
                </label>
                <input
                  type="text"
                  value={rawInputs.dietary_restrictions}
                  onChange={handlePreferenceChange("dietary_restrictions")}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Contoh: Vegetarian atau alergi kacang"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep("profile")}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  {isLoading ? "Menyimpan..." : "Selesaikan Setup"}
                </button>
              </div>
            </form>
          )}

          {/* Complete Step */}
          {currentStep === "complete" && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <span className="text-3xl">🎉</span>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Setup Selesai!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Profile dan preferensi Anda sudah disimpan. Sekarang Anda siap
                  untuk chat dengan AI fitness assistant!
                </p>
              </div>

              <button
                onClick={handleComplete}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Mulai Chat Sekarang
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
