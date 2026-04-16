import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { GlobalErrorShell } from "./GlobalErrorShell.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalErrorShell>
      <App />
    </GlobalErrorShell>
  </StrictMode>,
);
