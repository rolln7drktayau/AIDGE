# AIDGE Hardware Lab

An English/French browser workbench for exploring AIDGE Challenge hardware, visualizing an illustrative 3D board, exercising a synthetic camera-to-count pipeline, and reviewing live planning estimates. The primary profile is the ASYGN Smart Video Sensor / ColibryNPU track. Wildlife Monitoring (Alif Ensemble E7) and Aidge in Space (CPU/FPGA concept) are also represented as separate hardware profiles. Use the EN/FR toggle in the header.

## Start the simulator

Requirements: Node.js 20.19+ or 22.12+.

On Windows, double-click [`Start_AIDGE_Lab.cmd`](Start_AIDGE_Lab.cmd). It installs the npm dependencies on first launch, starts the local server and opens the simulator. Later launches reuse the installed dependencies.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build:

```powershell
npm test
npm run build
npm run preview
```

The 3D board is an illustrative, explodable model: drag to orbit, scroll to zoom, click a component, or open the immersive full-window viewer for top/bottom views, progressive component separation and the manufacturer reference image. Select a modeled part and use **Disconnect/Reconnect Part** for animated virtual removal and reassembly. This changes only the visual model. Placement follows annotated ASYGN product views, not a CAD assembly. No public dimensioned drawing or mechanical CAD was found, so the model is not millimetre-accurate. The primary synthetic grayscale scene animates people-like silhouettes, bounding boxes, track IDs and line crossings. The other two profiles show generic compute-flow animations and do not pretend to detect wildlife or reproduce a space mission. Controls change the workload estimates in real time. The virtual 20-second test and JSON report provide reproducible planning outputs.

See [`TUTORIAL.md`](TUTORIAL.md) for the English/French user guide, 3D controls, virtual test steps and USB/BLE telemetry setup. The hardware panel can read real measurements only after a firmware/host bridge emits newline-delimited JSON; it does not auto-detect inference results or program the board.

## Important: simulation versus target hardware

Browser-side latency, throughput, detection score, power, and working-set figures are transparent estimates from a simple Colibry planning model. The Colibry brief's 640 kB / 5 mW scorecard is explicitly marked as a reference when another track is selected; no calibrated Alif or FPGA performance model is included. The synthetic feed is not a trained detector or benchmark dataset. The app cannot emulate or flash the proprietary Colibry NNPA, and its geometry is not a pin-accurate manufacturer CAD model. Only physical runs on the appropriate evaluation board can establish challenge results. See [`firmware/README.md`](firmware/README.md) for the hardware checklist and telemetry bridge format.

The Smart Video Sensor brief targets person detection/tracking/counting, UINT8 model export, supported operators, a 640 kB NNPA memory budget, and scoring across accuracy, FPS and system power. Public challenge documents in the workspace provide the source details. The actual board kit, probe, hardware manual/datasheet and ASYGN toolchain are needed for final firmware bring-up and calibrated measurements.

## Deployment status

The **browser simulator** is runnable after `npm run build`. The **AIDGE challenge application is not yet ready to flash and run on an EvalBoardTiny**: this repo has no challenge-trained person detector, camera/NNPA firmware integration, telemetry firmware, board-specific build/flash configuration, or physical acceptance results. The public Colibry exporter is a starting point, not proof that this project's model is deployable. The browser's Disconnect/Reconnect Part buttons animate a selected 3D assembly only; they do not change physical hardware state. A true part-by-part, dimensionally accurate model and mechanical-fit claim also requires ASYGN's authorized CAD/dimension drawings and physical measurements.

After you connect a board today, you can grant the browser USB/BLE access and inspect incoming JSON telemetry **only if** separate firmware or a host bridge is already running and configured. The app does not discover the board's proprietary protocol, flash firmware, launch an inference, or perform the official challenge test automatically. See [`TUTORIAL.md`](TUTORIAL.md) and [`firmware/README.md`](firmware/README.md) for the exact boundary and remaining bring-up work.

## Hardware reference checkouts

The public source trees referenced by the challenge can be fetched locally without committing them into this app:

```powershell
git clone --depth 1 https://gitlab.eclipse.org/eclipse/aidge/aidge_export_colibry.git references/aidge_export_colibry
git clone --depth 1 https://gitlab.eclipse.org/olivierpds/alif_aidge_sdk.git references/alif_aidge_sdk
```

These two repositories are also checked out in this workspace's ignored `references/` directory for local inspection. They retain their own upstream licences and build prerequisites. The Alif SDK notes that some dependencies/toolchains are separately supplied and can be substantial; the simulator does not install or redistribute proprietary components.

## Tests

`npm test` checks the estimate model, resolution/memory behavior, challenge gate reporting, and telemetry parser using Node's built-in test runner.
