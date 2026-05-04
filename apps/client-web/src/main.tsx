import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { GlobalErrorShell } from "./GlobalErrorShell.tsx";
import { AppConfigProvider } from "./config/AppConfigContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppConfigProvider>
      <GlobalErrorShell>
        <App />
      </GlobalErrorShell>
    </AppConfigProvider>
  </StrictMode>,
);
