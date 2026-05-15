import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App.tsx";
import "./index.css";
import "driver.js/dist/driver.css";
import "./styles/tutorial.css";
import "./i18n";

(globalThis as any).Buffer ??= Buffer;

createRoot(document.getElementById("root")!).render(<App />);
