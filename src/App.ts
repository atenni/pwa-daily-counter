import { Wheel } from "./components/Wheel";
import { SettingsPanel } from "./components/SettingsPanel";

/**
 * Top‑level application component.
 * Renders two Wheel instances with customizable emojis.
 */
export class App {
  public element: HTMLElement;

  private wheelA: Wheel;
  private wheelB: Wheel;
  private settingsPanel: SettingsPanel;

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "app";

    // Create wheels first (before rendering)
    this.wheelA = new Wheel("wheelA");
    this.wheelB = new Wheel("wheelB");
    this.settingsPanel = new SettingsPanel();

    this.render();
  }

  private render() {
    // Container for wheels
    const wheelsContainer = document.createElement("div");
    wheelsContainer.className = "wheels-container";

    wheelsContainer.appendChild(this.wheelA.element);
    wheelsContainer.appendChild(this.wheelB.element);

    // Create wheel control rows (emoji + reset in single row)
    const topWheelRow = this.createWheelControlRow("Top Wheel", this.wheelA);
    const bottomWheelRow = this.createWheelControlRow(
      "Bottom Wheel",
      this.wheelB,
    );

    // Add controls to settings panel
    const contentSlot = document.createElement("div");
    contentSlot.setAttribute("slot", "content");
    contentSlot.appendChild(topWheelRow);
    contentSlot.appendChild(bottomWheelRow);
    this.settingsPanel.appendChild(contentSlot);

    // Assemble app
    this.element.appendChild(wheelsContainer);
    this.element.appendChild(this.settingsPanel);
  }

  /** Create a row with emoji input, target input, and reset button for a wheel */
  private createWheelControlRow(labelText: string, wheel: Wheel): HTMLElement {
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
    input.value = wheel.getEmoji();
    input.addEventListener("input", () => {
      wheel.setEmoji(input.value || "🔄");
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

    // Reset button
    const resetBtn = document.createElement("button");
    resetBtn.className = "reset-btn";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", () => wheel.reset());

    controls.appendChild(input);
    controls.appendChild(targetWrapper);
    controls.appendChild(resetBtn);
    row.appendChild(controls);

    return row;
  }
}
