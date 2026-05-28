import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { firebaseApp } from "./lib/firebase";
import { registerPwaShell } from "./lib/pwa";

void firebaseApp;
if (import.meta.env.PROD) {
  registerPwaShell();
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
