import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Aplikasi React Router Baru" },
    { name: "description", content: "Selamat datang di React Router!" },
  ];
}

export default function Home() {
  return <Welcome />;
}
