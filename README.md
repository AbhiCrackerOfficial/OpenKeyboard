# OpenKeyboard ⌨️✨

**OpenKeyboard** is a universal, open-source, web-based mechanical keyboard controller. It enables real-time lighting customizations, custom per-key canvas painting, and dynamic audio visualization directly from your web browser using the **WebHID API**—no native software, installers, or drivers required.

🔗 **Live Application:** [openkeyboard.abhicracker.com](https://openkeyboard.abhicracker.com)

---

## 🚀 Key Features

* **🔌 Zero-Installation WebHID:** Configures hardware registers directly in the browser. 100% driverless, secure, and cross-platform (Chrome, Edge, Opera, or any Chromium browser).
* **🎨 Premium Liquid Glass & Neo-Brutalist Themes:** Toggle between a glossy, fluid glassmorphic UI or a clean, sharp, high-contrast Neo-brutalist theme, supporting native light/dark modes.
* **🎼 Real-Time Audio Visualizer:** Streams live system audio frequency bins (FFT) directly onto the keyboard's LEDs with microsecond-level latency, supporting:
  * **Sparse Audio stream (0x13/0x88):** Lightweight native command updates.
  * **Direct RGB Framebuffer (0x06/0x08):** High-refresh full keyboard LED matrix stream.
* **🖌️ Per-Key Paint Board (Gaming mode):** Paint custom static colors on individual keys with a palette brush, erase inputs, and fill the layout instantly.
* **💾 Local Layout Templates:** Save your custom key layout profiles to browser `localStorage` and swap, import, or delete them instantly.
* **📡 Realtime Transmission Status:** Includes a pulsing telemetry indicator dot showing connection, transmit, success, and error states.
* **⚙️ Raw Diagnostic Debugging:** Toggle the live byte console to view incoming and outgoing hex report values for protocol reverse-engineering.

---

## 🛠️ Quick Start (Local Development)

### Prerequisites

* [Node.js](https://nodejs.org/) (v18+)
* A Chromium-based desktop web browser (e.g. Chrome, Edge, Brave) with WebHID support.

### Setup & Run

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/your-username/openkeyboard.git
   cd openkeyboard
   ```

2. Install dependencies for the frontend client:
   ```bash
   cd frontend
   ```
   If using `npm`:
   ```bash
   npm install
   ```
   If using `pnpm`:
   ```bash
   pnpm install
   ```

3. Start the Vite local development server:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173`.

---

## ☁️ Deploying to Cloudflare Workers

The project is hosted as a serverless static website on Cloudflare using Wrangler:

1. Log into your Cloudflare account:
   ```bash
   npx wrangler login
   ```

2. Deploy the build:
   ```bash
   npx wrangler deploy
   ```

---

## 🤝 Contributing Support for New Keyboards

OpenKeyboard is built to be a universal driver platform! If you have a custom or OEM keyboard (such as Royal Kludge, Keychron, Epomaker, Akko, etc.) and want to add configuration support for it, check out our developer integration guide:

📄 [**Keyboard Driver Contribution Guide (KEYBOARD_CONTRIBUTION.md)**](./KEYBOARD_CONTRIBUTION.md)

Adding a new keyboard requires no database modifications—just copy the schema, define your layout coordinates, implement the packet builder functions, and register your profile!

---

## 📄 License

OpenKeyboard is licensed under the [MIT License](./LICENSE). Feel free to modify, distribute, and contribute to this project!
