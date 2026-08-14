# Packet validation notes

These values are derived from the two supplied OEM Wireshark captures.

## `ripple_shining_red_brightness4_speed_3.pcapng`

Expected generated state:

- `report[18] = 0x07`
- `report[78] = 0x04`
- `report[79] = 0x30`
- effect palette RGB offset = `29 + (7 - 1) * 21 = 155`
- `palette[155:158] = FF 00 00`

## `self_define_for_any_color_to_anykey.pcapng`

OEM Self Define uses:

- config effect `report[18] = 0x15`
- config `report[17] = 0x01`
- second Feature Report command `report[1] = 0x06`
- RGB plane starts at `8`, `134`, and `260`

Between the two self-define writes, only these RGB bytes changed:

- R plane: report offset `13` = `FF`
- G plane: report offset `139` = `5C`
- B plane: report offset `265` = `D3`

Those offsets all resolve to logical LED index 5, color `#FF5CD3`.
