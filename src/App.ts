import { Wheel } from "./components/Wheel";

/**
 * Top‑level application component.
 * Renders two Wheel instances with customizable emojis.
 */
export class App {
  public element: HTMLElement;

  private wheelA!: Wheel;
  private wheelB!: Wheel;
  private settingsEl!: HTMLElement;
  private darkMode: boolean;
  private darkToggleBtn!: HTMLButtonElement;

  constructor() {
    // Initialize darkMode based on current body class (set in main.ts)
    this.darkMode = document.body.classList.contains("dark");
    this.element = document.createElement("div");
    this.element.className = "app";
    this.render();
  }

  private render() {
    // Container for wheels
    const wheelsContainer = document.createElement("div");
    wheelsContainer.className = "wheels-container";

    // Create wheels with default emojis and unique ids (step=1 for fine-grained control)
    this.wheelA = new Wheel("wheelA", "🏋️‍♂️", 1);
    this.wheelB = new Wheel("wheelB", "🤸‍♀️", 1);
    wheelsContainer.appendChild(this.wheelA.element);
    wheelsContainer.appendChild(this.wheelB.element);

    // Create wheel control rows (emoji + reset in single row)
    const topWheelRow = this.createWheelControlRow(
      "Top Wheel",
      this.wheelA,
      this.wheelA.element,
    );
    const bottomWheelRow = this.createWheelControlRow(
      "Bottom Wheel",
      this.wheelB,
      this.wheelB.element,
    );

    // Settings panel (hidden, slides up)
    this.settingsEl = this.createSettingsPanel([topWheelRow, bottomWheelRow]);

    // Assemble app
    this.element.appendChild(wheelsContainer);
    this.element.appendChild(this.settingsEl);
  }

  /** Create a row with emoji input, target input, and reset button for a wheel */
  private createWheelControlRow(
    labelText: string,
    wheel: Wheel,
    wheelEl: HTMLElement,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "wheel-control-row";

    // Label
    const label = document.createElement("label");
    label.textContent = labelText;
    row.appendChild(label);

    // Controls container (emoji + target + reset)
    const controls = document.createElement("div");
    controls.className = "wheel-controls";

    // Emoji input
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 2;
    input.value = wheelEl.querySelector(".wheel-emoji")?.textContent || "";
    input.addEventListener("input", () => {
      const newEmoji = input.value || "🔄";
      const emojiDiv = wheelEl.querySelector(".wheel-emoji");
      if (emojiDiv) {
        emojiDiv.textContent = newEmoji;
      }
    });

    // Target input
    const targetWrapper = document.createElement("div");
    targetWrapper.className = "target-input-wrapper";
    const targetLabel = document.createElement("span");
    targetLabel.textContent = "Target:";
    const targetInput = document.createElement("input");
    targetInput.type = "number";
    targetInput.className = "target-input";
    targetInput.value = String(wheel.getTarget());
    targetInput.min = "1";
    targetInput.addEventListener("change", () => {
      const newTarget = parseInt(targetInput.value, 10) || 100;
      wheel.setTarget(newTarget);
    });
    targetWrapper.appendChild(targetLabel);
    targetWrapper.appendChild(targetInput);

    // Reset button with current count
    const resetBtn = document.createElement("button");
    resetBtn.className = "reset-btn";
    const countSpan = wheelEl.querySelector(".wheel-count .count-value");
    const currentCount = countSpan?.textContent || "0";
    resetBtn.textContent = `Reset (${currentCount})`;

    // Update button text when count changes
    const observer = new MutationObserver(() => {
      const newCount = countSpan?.textContent || "0";
      resetBtn.textContent = `Reset (${newCount})`;
    });
    if (countSpan) {
      observer.observe(countSpan, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    resetBtn.addEventListener("click", () => {
      wheel.reset();
    });

    controls.appendChild(input);
    controls.appendChild(targetWrapper);
    controls.appendChild(resetBtn);
    row.appendChild(controls);

    return row;
  }

  /** Create the settings overlay containing the provided controls */
  private createSettingsPanel(controls: HTMLElement[]): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "settings";

    // Gripper handle - visible when panel is closed, clickable and swipeable
    const gripper = document.createElement("div");
    gripper.className = "settings-gripper";
    gripper.addEventListener("click", () => {
      panel.classList.toggle("open");
    });
    panel.appendChild(gripper);

    // Content container
    const content = document.createElement("div");
    content.className = "settings-content";

    // Help text - midnight reset info
    const helpText = document.createElement("p");
    helpText.className = "settings-help-text";
    helpText.textContent = "Counters reset at midnight";
    content.appendChild(helpText);

    // Append each control (emoji inputs)
    controls.forEach((c) => content.appendChild(c));

    // Dark mode toggle button
    this.darkToggleBtn = document.createElement("button");
    this.darkToggleBtn.className = "dark-toggle";
    this.updateDarkModeButtonText();
    this.darkToggleBtn.addEventListener("click", () => this.toggleDarkMode());
    content.appendChild(this.darkToggleBtn);

    panel.appendChild(content);

    // Add swipe gesture to the gripper
    this.addGripperSwipeListener(gripper, panel);

    return panel;
  }

  /** Update the dark mode toggle button text based on current state */
  private updateDarkModeButtonText(): void {
    this.darkToggleBtn.textContent = this.darkMode
      ? "☀️ Light Mode"
      : "🌙 Dark Mode";
  }

  /** Toggle dark mode by adding/removing the .dark class on <body> */
  private toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    if (this.darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    this.updateDarkModeButtonText();
  }

  /** Add a simple swipe‑up gesture from the bottom edge to open the settings panel */
  private addSwipeUpListener(): void {
    let startY = 0;
    const threshold = 80; // pixels upward movement required
    const edgeZone = 60; // must start within this distance from bottom

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const viewportHeight = window.innerHeight;
      if (viewportHeight - touch.clientY <= edgeZone) {
        startY = touch.clientY;
      } else {
        startY = 0;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!startY) return;
      const touch = e.touches[0];
      const delta = startY - touch.clientY;
      if (delta > threshold) {
        this.settingsEl.classList.add("open");
        startY = 0;
      }
    };

    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("touchmove", onTouchMove);
  }

  /** Add swipe gesture listener to the gripper handle */
  private addGripperSwipeListener(
    gripper: HTMLElement,
    panel: HTMLElement,
  ): void {
    let startY = 0;
    const threshold = 50; // pixels to trigger toggle

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!startY) return;
      const touch = e.touches[0];
      const delta = startY - touch.clientY;

      // If panel is closed, swipe up opens it
      // If panel is open, swipe down closes it
      const isOpen = panel.classList.contains("open");
      if (!isOpen && delta > threshold) {
        panel.classList.add("open");
        startY = 0;
      } else if (isOpen && delta < -threshold) {
        panel.classList.remove("open");
        startY = 0;
      }
    };

    const onTouchEnd = () => {
      startY = 0;
    };

    gripper.addEventListener("touchstart", onTouchStart);
    gripper.addEventListener("touchmove", onTouchMove);
    gripper.addEventListener("touchend", onTouchEnd);
  }
}
