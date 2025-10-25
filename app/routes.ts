import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"), // Default to login page
  route("home", "routes/home.tsx"),
  route("chat", "routes/chat.tsx"),
  route("profile", "routes/profile.tsx"),
] satisfies RouteConfig;
