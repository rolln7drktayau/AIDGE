# Hardware bring-up and telemetry bridge

The browser bench can consume measurements from an external USB serial bridge. It does not compile or flash the ColibryNPU, and it cannot emulate the proprietary NNPA. The bridge is intentionally a small, documented interface: keep the target-specific firmware in the ASYGN/AIDGE project and print one JSON object followed by `\n` for each completed image.

## Required equipment for the Smart Video Sensor track

- Colibry Tiny EvalBoard / ColibryNPU EvalBoardTiny.
- The ASYGN Colibry Probe (external programming/debug probe).
- Camera sensor connected through the board's camera/FPC interface.
- A host computer with the AIDGE environment and the ASYGN Colibry export/toolchain.
- A calibrated power analyzer or meter capable of measuring the board at the challenge's low-milliwatt range. The browser cannot infer physical power from FPS.
- Optional: a USB-to-UART bridge if the board firmware exposes telemetry over a serial console. Otherwise implement the same JSON fields in a host-side BLE collector and feed them to a serial bridge.

The published EvalBoardTiny page lists a QVA low-power image sensor, 32-bit RISC-V CPU, NNPA/FFT/ISP accelerators, nRF52832 BLE, microphone, 3-axis accelerometer, 8 Mbit external flash, GPIO/JTAG/SPI/I2C, a CR927 battery holder and an external probe requirement. Confirm connector pinout, voltage levels, probe model, and programming procedure against the board manual and datasheet supplied for your kit before wiring anything.

## Telemetry line format

The Web Serial panel expects newline-delimited JSON at 115200 baud:

```json
{"fps":12.4,"power_mw":4.1,"latency_ms":62,"accuracy":0.96,"memory_kb":412,"count":3,"timestamp":"2026-11-12T14:00:00Z"}
```

`fps`, `power_mw`, `latency_ms`, `accuracy`, `memory_kb`, and `count` update the corresponding live panels when supplied. `accuracy` is a fraction from 0 to 1. These values must come from actual device runs and a documented validation dataset; do not stream simulator estimates as measured hardware telemetry.

For an AIDGE-exported Colibry application, the public export source and examples are in `references/aidge_export_colibry/`. Inspect its generated `main.cpp`/template and board Makefile, then add telemetry at the application boundary after the camera, NNPA, MCU post-processing and output stages are wired. Use the supplied confidential board documents for exact low-level APIs.

## Hardware acceptance checklist

1. Verify the selected model uses only supported NNPA operators and UINT8 quantization.
2. Confirm weights plus input/working data fit the published 640 kB NNPA memory limit.
3. Build and flash with the ASYGN-provided probe/toolchain and the board's approved procedure.
4. Validate camera capture, inference completion/IRQ, tracking/counting, and result transport independently.
5. Measure complete-system power with a calibrated instrument and record measurement points, board configuration, clock, resolution and ambient conditions.
6. Evaluate detection quality on a held-out labelled set; the generated synthetic camera feed is a visual demo, not an accuracy dataset.
7. Connect a host USB serial bridge and verify one newline-delimited JSON sample per image before using this UI's hardware mode.
