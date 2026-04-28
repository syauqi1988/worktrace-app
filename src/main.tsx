import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "driver.js/dist/driver.css";
import "./styles/tutorial.css";
import "./i18n";

createRoot(document.getElementById("root")!).render(<App />);
