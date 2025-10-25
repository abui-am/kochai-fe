import type { Route } from "./+types/onboarding";
import { OnboardingFlow } from "~/components/onboarding-flow";
import { ProtectedRoute } from "~/components/protected-route";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Setup Profile - Fitness Chatbot" },
    {
      name: "description",
      content: "Lengkapi profile dan preferensi fitness Anda",
    },
  ];
}

export default function Onboarding() {
  return (
    <ProtectedRoute>
      <OnboardingFlow />
    </ProtectedRoute>
  );
}
