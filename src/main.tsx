import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "driver.js/dist/driver.css";
import "./styles/tutorial.css";

createRoot(document.getElementById("root")!).render(<App />);
