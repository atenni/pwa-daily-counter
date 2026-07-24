/**
 * Settings Panel Web Component
 * A reusable custom element for the Daily Counter PWA settings panel.
 *
 * Usage:
 * <settings-panel>
 *   <div slot="content">
 *     <!-- Custom settings content goes here -->
 *   </div>
 * </settings-panel>
 */

export class SettingsPanel extends HTMLElement {
  private panel: HTMLElement | null = null;
  private gripper: HTMLElement | null = null;
  private abortController: AbortController;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.abortController = new AbortController();
    this.render();
  }

  static get observedAttributes() {
    return ["open"];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "open" && this.panel) {
      this.panel.classList.toggle("open", newValue !== null);
    }
  }

  connectedCallback() {
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  private render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .settings {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          transform: translateY(calc(100% - 60px));
          height: auto;
          max-height: 60vh;
          background: linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
          transition:
            transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 100;
          }
          
          .settings.open {
            transform: translateY(0);
            box-shadow: 0 -8px 100px rgba(0, 0, 0, 0.75);
        }

        .settings-gripper {
          height: 60px;
          width: 100%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .settings-gripper::before {
          content: "";
          width: 48px;
          height: 5px;
          background: linear-gradient(90deg, #555 0%, #777 50%, #555 100%);
          border-radius: 3px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .settings-content {
          padding: 0 2rem 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          max-height: calc(60vh - 40px);
        }

        .settings-help-text {
          text-align: center;
          font-size: 0.875rem;
          color: #777;
          margin: 0;
        }

        ::slotted([slot="content"]) {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
      </style>

      <div class="settings" data-testid="settings-panel">
        <div class="settings-gripper" data-testid="settings-gripper"></div>
        <div class="settings-content">
        <slot name="content"></slot>
        <p class="settings-help-text">Counters reset daily</p>
        </div>
      </div>
    `;

    this.panel = this.shadowRoot.querySelector(".settings");
    this.gripper = this.shadowRoot.querySelector(".settings-gripper");
  }

  private setupEventListeners() {
    if (!this.gripper || !this.panel) return;

    const { signal } = this.abortController;

    // Gripper click to toggle
    this.gripper.addEventListener("click", this.handleGripperClick, { signal });

    // Swipe gestures
    this.addGripperSwipeListener(signal);
    this.addSwipeUpListener(signal);

    // Tap outside to close
    this.addTapOutsideListener(signal);
  }

  private removeEventListeners() {
    // All event listeners are automatically removed via AbortController
    this.abortController.abort();
  }

  private handleGripperClick = () => {
    if (!this.panel) return;
    const willBeOpen = !this.panel.classList.contains("open");
    this.panel.classList.toggle("open");
    this.updateOpenAttribute(willBeOpen);
  };

  private updateOpenAttribute(isOpen?: boolean) {
    if (!this.panel) return;
    const open = isOpen ?? this.panel.classList.contains("open");
    this.toggleAttribute("open", open);
  }

  private addGripperSwipeListener(signal: AbortSignal) {
    if (!this.gripper || !this.panel) return;

    let startY = 0;
    const threshold = 50;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!startY) return;
      const touch = e.touches[0];
      const delta = startY - touch.clientY;
      const isOpen = this.panel!.classList.contains("open");

      if (!isOpen && delta > threshold) {
        this.panel!.classList.add("open");
        this.updateOpenAttribute(true);
        startY = 0;
      } else if (isOpen && delta < -threshold) {
        this.panel!.classList.remove("open");
        this.updateOpenAttribute(false);
        startY = 0;
      }
    };

    const onTouchEnd = () => {
      startY = 0;
    };

    this.gripper.addEventListener("touchstart", onTouchStart, { signal });
    this.gripper.addEventListener("touchmove", onTouchMove, { signal });
    this.gripper.addEventListener("touchend", onTouchEnd, { signal });
  }

  private addSwipeUpListener(signal: AbortSignal) {
    let startY = 0;
    const threshold = 80;
    const edgeZone = 60;

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
      if (!startY || !this.panel) return;
      const touch = e.touches[0];
      const delta = startY - touch.clientY;
      if (delta > threshold) {
        this.panel.classList.add("open");
        this.updateOpenAttribute(true);
        startY = 0;
      }
    };

    document.addEventListener("touchstart", onTouchStart, { signal });
    document.addEventListener("touchmove", onTouchMove, { signal });
  }

  private addTapOutsideListener(signal: AbortSignal) {
    const onPointerDown = (e: PointerEvent) => {
      if (!this.panel) return;

      // Only handle when panel is open
      if (!this.panel.classList.contains("open")) return;

      // Check if click/touch is inside the panel using composedPath to pierce shadow DOM
      const composedPath = e.composedPath();
      const isInsidePanel = composedPath.includes(this.panel);

      if (!isInsidePanel) {
        this.close();
      }
    };

    // Use pointerdown to catch both mouse and touch interactions early
    document.addEventListener("pointerdown", onPointerDown, { signal });
  }

  // Public API
  public open() {
    if (this.panel) {
      this.panel.classList.add("open");
      this.updateOpenAttribute(true);
    }
  }

  public close() {
    if (this.panel) {
      this.panel.classList.remove("open");
      this.updateOpenAttribute(false);
    }
  }

  public toggle() {
    if (this.panel) {
      const willBeOpen = !this.panel.classList.contains("open");
      this.panel.classList.toggle("open");
      this.updateOpenAttribute(willBeOpen);
    }
  }

  public isOpen(): boolean {
    return this.panel?.classList.contains("open") ?? false;
  }
}

// Define the custom element
customElements.define("settings-panel", SettingsPanel);
