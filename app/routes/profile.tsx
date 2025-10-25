import React, { useState } from "react";
import type { Route } from "./+types/profile";
import { useAuth } from "~/contexts/auth-context";
import {
  fetchUserProfile,
  updateUserProfile,
  updateUserPreferences,
  type UserProfileUpdate,
  type UserPreferences,
} from "~/services/fitness-api";
import { ProtectedRoute } from "~/components/protected-route";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Profile - Fitness Chatbot" },
    { name: "description", content: "Kelola profile dan preferensi Anda" },
  ];
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileUpdate>({});
  const [preferences, setPreferences] = useState<UserPreferences>({});

  // Raw input values for better UX (don't process on every keystroke)
  const [rawInputs, setRawInputs] = useState({
    available_equipment: "",
    dietary_restrictions: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  React.useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profileData = await fetchUserProfile();
      setProfile({
        name: profileData.user.name,
        bio: "", // Would come from profile data
        location: "", // Would come from profile data
        website: "", // Would come from profile data
      });
      if (profileData.preferences) {
        setPreferences(profileData.preferences);
      }
    } catch (error) {
      setMessage({ type: "error", text: "Gagal memuat profile" });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await updateUserProfile(profile);
      await refreshUser();
      setMessage({ type: "success", text: "Profile berhasil diperbarui" });
    } catch (error) {
      setMessage({ type: "error", text: "Gagal memperbarui profile" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await updateUserPreferences(preferences);
      setMessage({ type: "success", text: "Preferensi berhasil diperbarui" });
    } catch (error) {
      setMessage({ type: "error", text: "Gagal memperbarui preferensi" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileChange =
    (field: keyof UserProfileUpdate) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProfile((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handlePreferenceChange =
    (field: keyof UserPreferences) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const inputValue = e.target.value;

      if (field === "available_equipment" || field === "dietary_restrictions") {
        // Store raw input for better UX (no processing on keystroke)
        setRawInputs((prev) => ({ ...prev, [field]: inputValue }));

        // Process the value for the data model
        const processedValue = inputValue
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        setPreferences((prev) => ({ ...prev, [field]: processedValue }));
      } else if (
        field === "fitness_goals" ||
        field === "preferred_workout_types"
      ) {
        // For select-like fields, process comma-separated values
        const processedValue = inputValue
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        setPreferences((prev) => ({ ...prev, [field]: processedValue }));
      } else {
        // For single-value fields, use the input directly
        setPreferences((prev) => ({ ...prev, [field]: inputValue }));
      }
    };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Profile Saya
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Kelola informasi profile dan preferensi fitness Anda
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            }`}
          >
            <p
              className={`text-sm ${
                message.type === "success"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Informasi Profile
            </h2>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={profile.name || ""}
                  onChange={handleProfileChange("name")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Email tidak dapat diubah
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio || ""}
                  onChange={handleProfileChange("bio")}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ceritakan tentang diri Anda..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Lokasi
                </label>
                <input
                  type="text"
                  value={profile.location || ""}
                  onChange={handleProfileChange("location")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Kota, Negara"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={profile.website || ""}
                  onChange={handleProfileChange("website")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="https://website.com"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? "Menyimpan..." : "Simpan Profile"}
              </button>
            </form>
          </div>

          {/* Fitness Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Preferensi Fitness
            </h2>

            <form onSubmit={handlePreferencesUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tujuan Fitness
                </label>
                <select
                  value={preferences.fitness_goals?.join(", ") || ""}
                  onChange={handlePreferenceChange("fitness_goals")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Pilih tujuan...</option>
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
                  Tingkat Pengalaman
                </label>
                <select
                  value={preferences.experience_level || ""}
                  onChange={handlePreferenceChange("experience_level")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Pilih tingkat...</option>
                  <option value="beginner">Pemula</option>
                  <option value="intermediate">Menengah</option>
                  <option value="advanced">Lanjutan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Frekuensi Latihan
                </label>
                <select
                  value={preferences.workout_frequency || ""}
                  onChange={handlePreferenceChange("workout_frequency")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Pilih frekuensi...</option>
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
                  Alat yang Tersedia
                </label>
                <input
                  type="text"
                  value={rawInputs.available_equipment}
                  onChange={handlePreferenceChange("available_equipment")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Dumbbell, barbell, treadmill (pisahkan dengan koma)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pembatasan Diet
                </label>
                <input
                  type="text"
                  value={rawInputs.dietary_restrictions}
                  onChange={handlePreferenceChange("dietary_restrictions")}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Vegetarian, alergi kacang (pisahkan dengan koma)"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {isLoading ? "Menyimpan..." : "Simpan Preferensi"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
