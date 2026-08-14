# Raindrops capture finding

Source capture: `raindrops_colorChange_brightness3_speed_2.pcapng`

The OEM 520-byte reports show:

- selected effect: report[18] = `0x05` (Raindrops)
- Raindrops per-effect settings: report[74] = `0x03` (brightness 3)
- report[75] = `0x20` (speed 2, single-color mode)
- palette custom RGB for Raindrops is **report[113..115] = `FF E2 00`**

This is the key bug in the previous frontend: it always wrote custom RGB to
report[29..31], which is only the Fixed On (#1) palette slot.

The palette layout is effect-specific in 21-byte blocks:

```text
RGB offset = 29 + (effectId - 1) * 21

Fixed On  #1  -> 29..31
Raindrops #5  -> 113..115
Sine Wave #13 -> 281..283
```

The official AULA screenshot shows `#00E2FF` while its channel sliders show
R=255, G=226, B=0. That text box is BGR-ordered. Standard RGB hex for those
sliders is `#FFE200`, and the USB report correctly contains `FF E2 00`.

The final frontend therefore uses standard `#RRGGBB` for editing and also shows
the AULA/BGR display value as a reference.
