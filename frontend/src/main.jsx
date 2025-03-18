import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App";

// Ensure React attaches the app to the root div
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);