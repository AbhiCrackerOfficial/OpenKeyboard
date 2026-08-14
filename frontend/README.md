# OpenKeyboard — Frontend Client Workspace ⌨️🎨

This folder contains the React + Vite frontend client for **OpenKeyboard**. It communicates with devices directly via the browser's **WebHID API**, offering customizable lighting presets, a visual per-key paint editor, and live audio visualizers.

## Tech Stack
- **Framework:** React 19
- **Build System:** Vite
- **Styling:** Vanilla CSS + TailwindCSS (for utility-first layout blocks)
- **Icons:** Lucide React

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open the browser:**
   Open the localhost URL in any desktop Chromium-based browser (Chrome, Edge, Opera) that supports WebHID.

## Directory Structure
- `src/components/`: Modular React components (e.g., Keyboard Visualizer, Floating Color Picker).
- `src/config/keyboards/`: Device driver files containing layout maps and protocol commands.
- `src/utils/`: Audio processing engines, protocol framing algorithms, and general helpers.
- `src/workers/`: Dedicated background WebHID stream workers for smooth audio visualization framing.
- `public/`: Static resources, SVG logos, and PWA manifest assets.
