import { App } from "./App";
import { checkDailyReset } from "./utils/counter";

// Check for daily reset on app initialization
checkDailyReset(["wheelA", "wheelB"]);

// Enable dark mode by default
document.body.classList.add("dark");

// Mount the application
const root = document.getElementById("app");
if (root) {
  const app = new App();
  root.appendChild(app.element);
} else {
  console.error("Root element #app not found");
}
