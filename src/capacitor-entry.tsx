// Client-only entry for the Capacitor / static SPA build.
//
// This does NOT hydrate server-rendered markup: it mounts the TanStack Router
// app directly into #root with createRoot(...).render(...). No SSR, no server
// functions, no .output/server needed.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import "./styles.css";
import { getRouter } from "./router";

const router = getRouter();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
