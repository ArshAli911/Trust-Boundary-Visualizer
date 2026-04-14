import React from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App";
import "./style/index.css";
import "./style/toolbar.css";
import "./style/canvas.css";
import "./style/inspector.css";
import "./style/finding.css";
import "./style/modal.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);