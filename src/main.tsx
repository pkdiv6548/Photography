import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Pages from "./Pages";
import "./styles.css";

const path = window.location.pathname.replace(/\/$/, "") || "/";
const app = path === "/" ? <App /> : <Pages />;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{app}</React.StrictMode>
);
