# AULA F87 / F87 Pro Web Controller

Installable Chromium WebHID controller for the wired AULA F87 / F87 Pro (`258A:010C`).

## What is implemented

- OEM 520-byte Feature Report settings path (`0x06`): read `0x84`, config `0x04`, palette `0x0A`.
- All firmware effects `0..18`, including a real **OFF** state.
- **Self Define / Per-Key RGB** (`effect 21`) using the captured OEM `0x06` RGB-plane report.
- Per-effect custom RGB palette slots, including the captured Ripples Shining and Raindrops behavior.
- Debounced Live Apply + latest-write-wins queue.
- 1-second Auto Sync without read/write feedback loops.
- Two real realtime audio transports only:
  - OEM Audio Stream: Output Report `0x13`, command `0x88`.
  - Direct RGB Framebuffer: Feature Report `0x06`, command `0x08`.
- Optional automatic fallback between those two real transports.
- AudioWorklet + Dedicated HID Worker path for smoother streaming when the controller tab is not foreground.
- Microphone and Chrome tab/system-audio capture.
- Installable PWA for Windows/macOS/Linux Chromium browsers.

## First run

```bash
npm install
npm run dev
```

Open the localhost URL in **Chrome or Edge**, click **Connect Keyboard**, and choose the F87.

The official AULA app should be closed while this controller owns the HID device.

## Production build

```bash
npm run build
```

The deployable site is written to `dist/`.

For Cloudflare static assets you can use the included `wrangler.jsonc` after building.

## Captured protocol checks used by this build

### Ripples Shining

The supplied OEM packet verifies:

- effect ID: `7`
- brightness: `4`
- speed: `3`
- single-color mode
- custom red stored in effect 7's palette slot (`155..157`): `FF 00 00`

### Self Define / Per-Key

The supplied OEM packet verifies:

- effect selector: `21` (`0x15`)
- config flag at report offset `17`: `0x01`
- per-key command: Feature Report `0x06`, command `0x06`
- 126-byte RGB planes:
  - R: report `8..133`
  - G: report `134..259`
  - B: report `260..385`
- the second edit changed logical LED index `5` to `#FF5CD3` (`FF / 5C / D3` in the three planes)

The current physical map labels index 5 as the left Ctrl key. Right Ctrl is index 83 in the known F87 LED map, so the editor exposes both by their mapped keyboard positions rather than hard-coding the capture description.

## OFF behavior

Selecting OFF writes the real firmware effect ID `0`. The site accent becomes neutral gray and lighting-specific controls are disabled. The effect selector remains enabled so lighting can be turned back on.

## Background audio

The preferred path is:

`MediaStream -> AudioWorklet -> MessageChannel -> Dedicated Worker -> WebHID`

This avoids using the page's `requestAnimationFrame` / page timer loop for keyboard frames. A foreground fallback remains for browser builds that do not expose WebHID in a dedicated worker.

## Browser note

This project targets desktop Chromium browsers with WebHID. It requires a secure context (`https://` or localhost) for deployment features such as WebHID/PWA/audio capture.
