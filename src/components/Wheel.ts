import { increment, getCount, reset } from "../utils/counter";

export class Wheel {
  /** Root element of the wheel */
  public element: HTMLElement;

  private id: string;
  private emoji: string;
  private step: number;
  private target: number;
  // These elements are created in `createWheel()` and assigned before use.
  // Use definite assignment assertions to satisfy the TypeScript compiler.
  private countSpan!: HTMLSpanElement;
  private targetSpan!: HTMLSpanElement;
  private thumb!: HTMLElement;
  private isDragging = false;
  private lastAngle = 0; // raw angle for delta calculation
  private rawAngle = 0; // unwrapped angle for continuous rotation tracking

  // Derive visual angle from raw angle
  private get currentAngle(): number {
    return ((this.rawAngle % 360) + 360) % 360;
  }

  // Draft mode state for pending increments
  private draftIncrement = 0;
  private isDraftMode = false;
  private baseCount = 0;
  private emojiDiv!: HTMLElement;
  private countDiv!: HTMLElement;
  private draftDisplay!: HTMLElement;
  private saveButton!: HTMLButtonElement;
  private draftCountEl!: HTMLDivElement;

  constructor(
    id: string,
    emoji: string = "🔄",
    step: number = 20,
    target: number = 100,
  ) {
    this.id = id;
    this.emoji = emoji;
    this.step = step;
    this.target = target;
    this.element = this.createWheel();
    this.updateCount();
  }

  /** Create the DOM structure for the wheel */
  private createWheel(): HTMLElement {
    const container = document.createElement("div");
    container.className = "wheel";

    // Emoji centre
    this.emojiDiv = document.createElement("div");
    this.emojiDiv.className = "wheel-emoji";
    this.emojiDiv.textContent = this.emoji;
    container.appendChild(this.emojiDiv);

    // Count display with target (e.g., "7/100")
    this.countDiv = document.createElement("div");
    this.countDiv.className = "wheel-count";
    this.countSpan = document.createElement("span");
    this.countSpan.className = "count-value";
    this.targetSpan = document.createElement("span");
    this.targetSpan.className = "target-value";
    this.countDiv.appendChild(this.countSpan);
    this.countDiv.appendChild(document.createTextNode("/"));
    this.countDiv.appendChild(this.targetSpan);
    container.appendChild(this.countDiv);

    // Draft mode display (hidden by default)
    this.draftDisplay = document.createElement("div");
    this.draftDisplay.className = "wheel-draft-display";
    this.draftDisplay.style.display = "none";
    this.draftCountEl = document.createElement("div");
    this.draftCountEl.className = "draft-count";
    this.draftDisplay.appendChild(this.draftCountEl);

    // Save button
    this.saveButton = document.createElement("button");
    this.saveButton.className = "save-btn";
    this.saveButton.textContent = "Save";
    this.saveButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.commitDraft();
    });
    this.draftDisplay.appendChild(this.saveButton);
    container.appendChild(this.draftDisplay);

    // Thumb element (placed on circumference)
    this.thumb = document.createElement("div");
    this.thumb.className = "wheel-thumb";
    container.appendChild(this.thumb);

    // Click outside to cancel draft mode
    document.addEventListener("click", (e) => {
      if (this.isDraftMode && !container.contains(e.target as Node)) {
        this.exitDraftMode();
      }
    });

    // Drag handling (mouse & touch)
    const getCoords = (e: MouseEvent | TouchEvent): [number, number] =>
      "touches" in e
        ? [e.touches[0].clientX, e.touches[0].clientY]
        : [e.clientX, e.clientY];

    const startDrag = (clientX: number, clientY: number) => {
      this.isDragging = true;
      this.lastAngle = this._calcAngle(clientX, clientY, container);
      if (!this.isDraftMode) this.enterDraftMode();
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!this.isDragging) return;
      const newWrappedAngle = this._calcAngle(clientX, clientY, container);
      const stepDeg = 18; // 360 / 20

      let delta = newWrappedAngle - this.lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      this.rawAngle += delta;
      const increments =
        Math.trunc(this.rawAngle / stepDeg) -
        Math.trunc((this.rawAngle - delta) / stepDeg);

      if (increments !== 0) {
        this.draftIncrement += increments * this.step;
        this._updateVisuals(container);
        this.updateDraftDisplay();
      }

      this.lastAngle = newWrappedAngle;
    };

    const endDrag = () => (this.isDragging = false);

    container.addEventListener("mousedown", (e) => startDrag(...getCoords(e)));
    container.addEventListener("touchstart", (e) => startDrag(...getCoords(e)));
    window.addEventListener("mousemove", (e) => onMove(...getCoords(e)));
    window.addEventListener("touchmove", (e) => onMove(...getCoords(e)));
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);

    // Initial visual state
    this._updateVisuals(container);

    return container;
  }

  /** Refresh the displayed count from storage */
  private updateCount() {
    const current = getCount(this.id);
    this.countSpan.textContent = String(current);
    this.targetSpan.textContent = String(this.target);
  }

  /** Enter draft mode - hide emoji/count, show draft display */
  private enterDraftMode() {
    this.isDraftMode = true;
    this.baseCount = getCount(this.id);
    this.draftIncrement = 0;
    // Always start thumb at 12 o'clock for new draft session
    this.rawAngle = 0;
    this._updateVisuals(this.element);
    this.emojiDiv.style.display = "none";
    this.countDiv.style.display = "none";
    this.draftDisplay.style.display = "flex";
    this.updateDraftDisplay();
  }

  /** Exit draft mode - show emoji/count, hide draft display */
  private exitDraftMode() {
    this.isDraftMode = false;
    this.draftIncrement = 0;
    this.emojiDiv.style.display = "";
    this.countDiv.style.display = "";
    this.draftDisplay.style.display = "none";
    // Always reset thumb to 12 o'clock when exiting draft mode
    this.rawAngle = 0;
    this._updateVisuals(this.element);
    this.updateCount();
  }

  /** Update the draft display with current draft increment */
  private updateDraftDisplay() {
    this.draftCountEl.textContent = String(this.draftIncrement);
  }

  /** Commit the draft increment to storage */
  private commitDraft() {
    if (this.draftIncrement !== 0) {
      increment(this.draftIncrement, this.id);
    }
    this.exitDraftMode();
    // Reset thumb to 12 o'clock after saving (rawAngle already 0 from exitDraftMode)
    this._updateVisuals(this.element);
  }

  /** Get the current target value */
  public getTarget(): number {
    return this.target;
  }

  /** Set a new target value */
  public setTarget(target: number): void {
    this.target = target;
    this.targetSpan.textContent = String(this.target);
  }

  /** Public method to reset this wheel's counter */
  public reset(): void {
    reset(this.id);
    this.rawAngle = 0;
    this._updateVisuals(this.element);
    this.updateCount();
  }

  /** Calculate angle (0‑360) from center of element to pointer */
  private _calcAngle(
    clientX: number,
    clientY: number,
    el: HTMLElement,
  ): number {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180
    angle = (angle + 90) % 360; // make 0 at top
    if (angle < 0) angle += 360;
    return angle;
  }

  /** Update wheel background gradient and thumb position */
  private _updateVisuals(el: HTMLElement): void {
    // Update the CSS variable that controls the wheel angle. The actual colors are
    // defined via CSS variables (--progress-color and --bg-color) which can be
    // overridden for dark mode.
    el.style.setProperty("--wheel-angle", `${this.currentAngle}deg`);

    // Position the thumb. Guard against zero dimensions which can happen before the
    // element is attached to the DOM (clientWidth/height would be 0). In that case we
    // let the default CSS positioning place the thumb at 12 o'clock.
    // Account for the ring thickness (16px) when calculating radius.
    const ringThickness = 16;
    const radius = el.clientWidth / 2 - ringThickness / 2;
    if (radius > 0) {
      const rad = ((this.currentAngle - 90) * Math.PI) / 180; // convert to radians, offset so 0deg = top
      const cx = el.clientWidth / 2 + radius * Math.cos(rad);
      const cy = el.clientHeight / 2 + radius * Math.sin(rad);
      this.thumb.style.left = `${cx}px`;
      this.thumb.style.top = `${cy}px`;
    }
  }
}
