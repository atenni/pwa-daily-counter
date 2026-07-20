import { App } from "./App";
import { startMidnightReset } from "./utils/counter";

// Initialize the midnight reset timer
// Initialize the midnight reset timer and enable dark mode by default
startMidnightReset();
document.body.classList.add("dark");

// Mount the application
const root = document.getElementById("app");
if (root) {
  const app = new App();
  root.appendChild(app.element);
} else {
  console.error("Root element #app not found");
}
