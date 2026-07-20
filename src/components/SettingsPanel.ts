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

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.render();
  }

  static get observedAttributes() {
    return ["open"];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "open" && this.panel) {
      if (newValue !== null) {
        this.panel.classList.add("open");
      } else {
        this.panel.classList.remove("open");
      }
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
          transform: translateY(calc(100% - 40px));
          height: auto;
          max-height: 60vh;
          background: linear-gradient(180deg, #2a2a2a 0%, #1e1e1e 100%);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 100;
        }

        .settings.open {
          transform: translateY(0);
        }

        .settings-gripper {
          height: 40px;
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
          color: #999;
          margin: 0;
          font-style: italic;
        }

        ::slotted([slot="content"]) {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
      </style>

      <div class="settings">
        <div class="settings-gripper"></div>
        <div class="settings-content">
          <p class="settings-help-text">Counters reset at midnight</p>
          <slot name="content"></slot>
        </div>
      </div>
    `;

    this.panel = this.shadowRoot.querySelector(".settings");
    this.gripper = this.shadowRoot.querySelector(".settings-gripper");
  }

  private setupEventListeners() {
    if (!this.gripper || !this.panel) return;

    // Gripper click to toggle
    this.gripper.addEventListener("click", this.handleGripperClick);

    // Swipe gestures
    this.addGripperSwipeListener();
    this.addSwipeUpListener();
  }

  private removeEventListeners() {
    if (!this.gripper) return;

    this.gripper.removeEventListener("click", this.handleGripperClick);
  }

  private handleGripperClick = () => {
    if (!this.panel) return;
    this.panel.classList.toggle("open");
    this.updateOpenAttribute();
  };

  private updateOpenAttribute() {
    if (!this.panel) return;
    if (this.panel.classList.contains("open")) {
      this.setAttribute("open", "");
    } else {
      this.removeAttribute("open");
    }
  }

  private addGripperSwipeListener() {
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
        this.updateOpenAttribute();
        startY = 0;
      } else if (isOpen && delta < -threshold) {
        this.panel!.classList.remove("open");
        this.updateOpenAttribute();
        startY = 0;
      }
    };

    const onTouchEnd = () => {
      startY = 0;
    };

    this.gripper.addEventListener("touchstart", onTouchStart);
    this.gripper.addEventListener("touchmove", onTouchMove);
    this.gripper.addEventListener("touchend", onTouchEnd);
  }

  private addSwipeUpListener() {
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
        this.updateOpenAttribute();
        startY = 0;
      }
    };

    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("touchmove", onTouchMove);
  }

  // Public API
  public open() {
    if (this.panel) {
      this.panel.classList.add("open");
      this.updateOpenAttribute();
    }
  }

  public close() {
    if (this.panel) {
      this.panel.classList.remove("open");
      this.updateOpenAttribute();
    }
  }

  public toggle() {
    if (this.panel) {
      this.panel.classList.toggle("open");
      this.updateOpenAttribute();
    }
  }

  public isOpen(): boolean {
    return this.panel?.classList.contains("open") ?? false;
  }
}

// Define the custom element
customElements.define("settings-panel", SettingsPanel);
