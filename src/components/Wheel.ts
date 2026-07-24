import { increment, getCount, reset } from "../utils/counter";

// Storage keys for wheel settings
const getEmojiKey = (id: string) => `wheel-${id}-emoji`;
const getTargetKey = (id: string) => `wheel-${id}-target`;

interface WheelElements {
  countSpan: HTMLSpanElement;
  targetSpan: HTMLSpanElement;
  thumb: HTMLElement;
  emojiDiv: HTMLElement;
  countDiv: HTMLElement;
  draftDisplay: HTMLElement;
  saveButton: HTMLButtonElement;
  draftCountEl: HTMLDivElement;
}

interface DragState {
  isDragging: boolean;
  lastAngle: number;
  rawAngle: number;
}

interface DraftState {
  increment: number;
  isActive: boolean;
  baseCount: number;
}

export class Wheel {
  /** Root element of the wheel */
  public element: HTMLElement;

  private id: string;
  private emoji: string;
  private target: number;
  private repsPerRotation: number;
  private elements: WheelElements;
  private dragState: DragState;
  private draftState: DraftState;
  private abortController: AbortController;

  // Derive visual angle from raw angle
  private get currentAngle(): number {
    return ((this.dragState.rawAngle % 360) + 360) % 360;
  }

  constructor(
    id: string,
    defaultEmoji: string = "🔄",
    defaultTarget: number = 100,
    repsPerRotation: number = 20,
  ) {
    this.id = id;
    this.emoji = localStorage.getItem(getEmojiKey(id)) ?? defaultEmoji;
    this.target =
      parseInt(
        localStorage.getItem(getTargetKey(id)) ?? String(defaultTarget),
        10,
      ) || defaultTarget;
    this.repsPerRotation = repsPerRotation;
    this.abortController = new AbortController();
    this.dragState = { isDragging: false, lastAngle: 0, rawAngle: 0 };
    this.draftState = { increment: 0, isActive: false, baseCount: 0 };
    this.elements = this.createWheelElements();
    this.element = this.createWheel();
    this.updateCount();
  }

  /** Clean up event listeners when wheel is destroyed */
  public destroy(): void {
    this.abortController.abort();
  }

  /** Create element references (separated from DOM creation for proper initialization) */
  private createWheelElements(): WheelElements {
    return {
      countSpan: document.createElement("span"),
      targetSpan: document.createElement("span"),
      thumb: document.createElement("div"),
      emojiDiv: document.createElement("div"),
      countDiv: document.createElement("div"),
      draftDisplay: document.createElement("div"),
      saveButton: document.createElement("button"),
      draftCountEl: document.createElement("div"),
    };
  }

  /** Create the DOM structure for the wheel */
  private createWheel(): HTMLElement {
    const container = document.createElement("div");
    container.className = "wheel";
    container.setAttribute("data-testid", `wheel-${this.id}`);

    // Emoji centre
    this.elements.emojiDiv.className = "wheel-emoji";
    this.elements.emojiDiv.textContent = this.emoji;
    this.elements.emojiDiv.setAttribute(
      "data-testid",
      `wheel-emoji-${this.id}`,
    );
    container.appendChild(this.elements.emojiDiv);

    // Count display with target (e.g., "7/100")
    this.elements.countDiv.className = "wheel-count";
    this.elements.countSpan.className = "count-value";
    this.elements.countSpan.setAttribute(
      "data-testid",
      `count-value-${this.id}`,
    );
    this.elements.targetSpan.className = "target-value";
    this.elements.targetSpan.setAttribute(
      "data-testid",
      `target-value-${this.id}`,
    );
    this.elements.countDiv.appendChild(this.elements.countSpan);
    this.elements.countDiv.appendChild(document.createTextNode("/"));
    this.elements.countDiv.appendChild(this.elements.targetSpan);
    container.appendChild(this.elements.countDiv);

    // Draft mode display (hidden by default)
    this.elements.draftDisplay.className = "wheel-draft-display";
    this.elements.draftDisplay.style.display = "none";
    this.elements.draftDisplay.setAttribute(
      "data-testid",
      `draft-display-${this.id}`,
    );
    this.elements.draftCountEl.className = "draft-count";
    this.elements.draftCountEl.setAttribute(
      "data-testid",
      `draft-count-${this.id}`,
    );
    this.elements.draftDisplay.appendChild(this.elements.draftCountEl);

    // Save button
    this.elements.saveButton.className = "save-btn";
    this.elements.saveButton.textContent = "Save";
    this.elements.saveButton.setAttribute("data-testid", `save-btn-${this.id}`);
    this.elements.saveButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.commitDraft();
    });
    this.elements.draftDisplay.appendChild(this.elements.saveButton);
    container.appendChild(this.elements.draftDisplay);

    // Thumb element (placed on circumference)
    this.elements.thumb.className = "wheel-thumb";
    this.elements.thumb.setAttribute("data-testid", `wheel-thumb-${this.id}`);
    container.appendChild(this.elements.thumb);

    // Click outside to cancel draft mode
    document.addEventListener(
      "click",
      (e) => {
        if (this.draftState.isActive && !container.contains(e.target as Node)) {
          this.exitDraftMode();
        }
      },
      { signal: this.abortController.signal },
    );

    // Drag handling (mouse & touch)
    const getCoords = (e: MouseEvent | TouchEvent): [number, number] =>
      "touches" in e
        ? [e.touches[0].clientX, e.touches[0].clientY]
        : [e.clientX, e.clientY];

    const startDrag = (clientX: number, clientY: number) => {
      this.dragState.isDragging = true;
      this.dragState.lastAngle = this.calcAngle(clientX, clientY, container);
      if (!this.draftState.isActive) this.enterDraftMode();
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!this.dragState.isDragging) return;
      const newWrappedAngle = this.calcAngle(clientX, clientY, container);
      const stepDeg = 360 / this.repsPerRotation;

      let delta = newWrappedAngle - this.dragState.lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      this.dragState.rawAngle += delta;
      const increments =
        Math.floor(this.dragState.rawAngle / stepDeg) -
        Math.floor((this.dragState.rawAngle - delta) / stepDeg);

      if (increments !== 0) {
        this.draftState.increment += increments;
        this.updateVisuals(container);
        this.updateDraftDisplay();
      }

      this.dragState.lastAngle = newWrappedAngle;
    };

    const endDrag = () => (this.dragState.isDragging = false);

    const { signal } = this.abortController;
    container.addEventListener("mousedown", (e) => startDrag(...getCoords(e)), {
      signal,
    });
    container.addEventListener(
      "touchstart",
      (e) => startDrag(...getCoords(e)),
      { signal },
    );
    window.addEventListener("mousemove", (e) => onMove(...getCoords(e)), {
      signal,
    });
    window.addEventListener("touchmove", (e) => onMove(...getCoords(e)), {
      signal,
    });
    window.addEventListener("mouseup", endDrag, { signal });
    window.addEventListener("touchend", endDrag, { signal });

    // Initial visual state
    this.updateVisuals(container);

    return container;
  }

  /** Refresh the displayed count from storage */
  private updateCount() {
    const current = getCount(this.id);
    this.elements.countSpan.textContent = String(current);
    this.elements.targetSpan.textContent = String(this.target);
  }

  /** Enter draft mode - hide emoji/count, show draft display */
  private enterDraftMode() {
    this.draftState.isActive = true;
    this.draftState.baseCount = getCount(this.id);
    this.draftState.increment = 0;
    this.dragState.rawAngle = 0;
    this.updateVisuals(this.element);
    this.elements.emojiDiv.style.display = "none";
    this.elements.countDiv.style.display = "none";
    this.elements.draftDisplay.style.display = "flex";
    this.updateDraftDisplay();
  }

  /** Exit draft mode - show emoji/count, hide draft display */
  private exitDraftMode() {
    this.draftState.isActive = false;
    this.draftState.increment = 0;
    this.elements.emojiDiv.style.display = "";
    this.elements.countDiv.style.display = "";
    this.elements.draftDisplay.style.display = "none";
    this.dragState.rawAngle = 0;
    this.updateVisuals(this.element);
    this.updateCount();
  }

  /** Update the draft display with current draft increment */
  private updateDraftDisplay() {
    this.elements.draftCountEl.textContent = String(this.draftState.increment);
  }

  /** Commit the draft increment to storage */
  private commitDraft() {
    if (this.draftState.increment !== 0) {
      increment(this.draftState.increment, this.id);
    }
    this.exitDraftMode();
  }

  /** Get the current target value */
  public getTarget(): number {
    return this.target;
  }

  /** Set a new target value and persist to localStorage */
  public setTarget(target: number): void {
    this.target = target;
    this.elements.targetSpan.textContent = String(this.target);
    localStorage.setItem(getTargetKey(this.id), String(target));
  }

  /** Get the current emoji */
  public getEmoji(): string {
    return this.emoji;
  }

  /** Set a new emoji and persist to localStorage */
  public setEmoji(emoji: string): void {
    this.emoji = emoji;
    this.elements.emojiDiv.textContent = emoji;
    localStorage.setItem(getEmojiKey(this.id), emoji);
  }

  /** Public method to reset this wheel's counter */
  public reset(): void {
    reset(this.id);
    this.dragState.rawAngle = 0;
    this.updateVisuals(this.element);
    this.updateCount();
  }

  /** Calculate angle (0‑360) from center of element to pointer */
  private calcAngle(clientX: number, clientY: number, el: HTMLElement): number {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (angle + 90) % 360;
    if (angle < 0) angle += 360;
    return angle;
  }

  /** Update wheel background gradient and thumb position */
  private updateVisuals(el: HTMLElement): void {
    el.style.setProperty("--wheel-angle", `${this.currentAngle}deg`);

    const ringThickness = 24;
    const radius = el.clientWidth / 2 - ringThickness / 2;
    if (radius > 0) {
      const rad = ((this.currentAngle - 90) * Math.PI) / 180;
      const cx = el.clientWidth / 2 + radius * Math.cos(rad);
      const cy = el.clientHeight / 2 + radius * Math.sin(rad);
      this.elements.thumb.style.left = `${cx}px`;
      this.elements.thumb.style.top = `${cy}px`;
    }
  }
}
