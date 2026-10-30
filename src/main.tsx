import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Pages from "./Pages";
import CustomerPages from "./CustomerPages";
import "./styles.css";

const path = window.location.pathname.replace(/\/$/, "") || "/";
const existingPages = ["/services", "/showreel", "/login", "/register", "/admin"];
const app = existingPages.includes(path) ? <Pages /> : <CustomerPages />;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>{app ?? (path === "/" ? <App /> : <Pages />)}</React.StrictMode>
);
