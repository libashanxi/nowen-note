import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import App from "./App";
import "./index.css";
import { initCodeBlockTheme } from "./lib/codeBlockTheme";

// 在应用渲染前应用已保存的代码块主题，避免首帧闪烁
initCodeBlockTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
