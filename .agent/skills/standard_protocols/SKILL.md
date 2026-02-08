---
name: Project Standard Protocols
description: Standardized architecture, persistence, and UI patterns for Cody's suite of React apps.
---

# Project Standard Protocols

This document defines the core architecture and UI standards for this project, ensuring consistency across `lifamily`, `OT_calculation`, and `guardian_dashboard`.

## 1. Data Architecture
- **Infrastructure**: All data is persisted to a private **GitHub Gist**.
- **Sync Logic**: Implemented in `src/lib/storage.js`.
- **Workflow**: 
  - On Page Load: Background fetch and merge.
  - On Change: Update local state immediately -> Push to Gist -> Show Toast.
- **Filenames**: `records.json` (data), `settings.json` (configs).

## 2. UI & Design System
- **Language**: Neumorphism + Glassmorphism.
- **Tabbar Style**: 
  - Floating bar at bottom.
  - `backdrop-blur-xl`, semi-transparent card.
  - Active tab scaling and spring animation (`framer-motion`).
  - **Sliding Glass Refraction Lens**: A circular refractive lens (`glass-refraction`) that is taller than the bar and follows the active tab.
  - Active labels only; inactive tabs show icons only.
- **Responsiveness**: 
  - Mobile-first design.
  - Desktop view uses a centered container (typically `max-w-md` for mobile-feeling tools).

## 3. Technology Stack
- **Framework**: React + Vite.
- **Styling**: Tailwind CSS + Vanilla CSS (`index.css`) for Neumorphic shadows.
- **Deployment**: Vercel.

## 4. Agent Operational Rules
- **Documentation**: Always maintain `task.md`, `implementation_plan.md`, and `walkthrough.md`.
- **Diagnostics**: Use detailed `console.log` prefixes (e.g., `Sync: ...`, `Auth: ...`) for easier production debugging.
- **Credential Safety**: Never hardcode tokens; use `localStorage` for user-provided credentials.

---
See also: `[Global Rules](file:///Users/cody/rule.json)`
