import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function verificationPlugin(env: Record<string, string>): Plugin {
  return {
    name: "site-verification",
    transformIndexHtml(html) {
      const tags = [
        env.VITE_GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${env.VITE_GOOGLE_SITE_VERIFICATION}" />` : "",
        env.VITE_YANDEX_SITE_VERIFICATION ? `<meta name="yandex-verification" content="${env.VITE_YANDEX_SITE_VERIFICATION}" />` : "",
      ].filter(Boolean).join("\n    ");
      return html.replace("<!-- site-verification -->", tags);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), verificationPlugin(env)],
    base: "/",
  };
});
