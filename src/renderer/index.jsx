import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// if it doesn't work
// do this to download fontawesome: npm install @fortawesome/fontawesome-free @fontsource/outfit
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
