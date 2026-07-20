# Daily Counter PWA

A mobile-first Progressive Web App for tracking daily push-ups with intuitive wheel counters.

## Features

- **Two wheel counters** - Track different exercises with customizable emojis
- **Draft mode** - Preview count before saving; cancel if you overshoot
- **Incremental counting** - 1 rep per step, 20 steps per rotation
- **Auto midnight reset** - Start fresh each day
- **Per-wheel targets** - Default goal: 100 reps
- **Dark mode** - Easy on the eyes
- **Offline capable** - Works without internet

## Quickstart

```bash
npm install
npm run dev      # http://localhost:5173/pwa-daily-counter/
npm run build    # Output to dist/
npm run test:e2e # Playwright tests
```

## Usage

1. Drag wheel thumb to add reps
2. Tap **Save** to commit, or tap outside to cancel
3. Swipe up for settings (emojis, targets, dark mode)

## Tech Stack

- Vite + TypeScript
- Vanilla Web Components (Shadow DOM)
- Playwright (e2e) + Vitest (unit)
- localStorage persistence

## Project Structure

```
src/
├── components/Wheel.ts      # Counter with draft mode
├── components/SettingsPanel.ts # Web component
├── utils/counter.ts         # localStorage logic
└── styles/main.css
tests/e2e/counter.spec.ts
```

## Customization

```typescript
// src/App.ts - Change step value
new Wheel("wheelA", "🏋️‍♂️", 1); // 1 rep per step

// src/styles/main.css - Wheel size
.wheel { width: 260px; height: 260px; }
```

## Testing

Primary viewport: **iPhone 14 Pro (393×852)**

MIT License
