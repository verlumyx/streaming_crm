import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Meta and Telegram webhooks are tested through a tunnel in development.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app"],
};

export default nextConfig;
