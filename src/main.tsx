import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AudioPlayerProvider } from "./audio/AudioPlayerContext";
import "@fontsource/manrope/cyrillic-400.css";
import "@fontsource/manrope/cyrillic-600.css";
import "@fontsource/manrope/cyrillic-700.css";
import "@fontsource/manrope/cyrillic-800.css";
import "@fontsource/literata/cyrillic-500.css";
import "@fontsource/literata/cyrillic-600.css";
import "@fontsource/literata/cyrillic-700.css";
import "./i18n";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AudioPlayerProvider>
        <App />
      </AudioPlayerProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
