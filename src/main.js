import './styles.css';
import { createBoardScene } from './board-scene.js';
import { estimatePipeline, getGoalStatus, parseTelemetryLine, LIMITS } from './simulation.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="AIDGE Hardware Lab home"><span class="brand-mark">A</span><span>AIDGE <b>HARDWARE LAB</b></span></a>
      <div class="top-meta"><span class="live-dot"></span><span id="connection-label">VIRTUAL BENCH · LIVE ESTIMATES</span><span class="divider"></span><span>CHALLENGE 2026</span></div>
      <div class="top-actions"><button class="lang-button" id="language-button">FRANÇAIS</button><button class="help-button" id="help-button">USER GUIDE ↗</button></div>
    </header>

    <main>
      <section class="intro-row">
        <div><div class="eyebrow"><span>01</span> <span id="intro-kicker">EMBEDDED AI TEST ENVIRONMENT</span></div><h1 id="hero-title">Build it before<br><em>you plug it in.</em></h1><p class="intro-copy" id="hero-copy">Explore the hardware, exercise the full inference pipeline, and see how design choices move your accuracy, speed, memory and power budget.</p></div>
        <div class="target-card"><span class="target-icon">◎</span><div><small id="active-target-label">ACTIVE TARGET</small><strong id="target-name">COLIBRYNPU · SMART VIDEO</strong><span id="target-workload">People detection & counting</span></div></div>
      </section>

      <nav class="track-tabs" aria-label="Challenge hardware tracks">
        <button class="track-tab active" data-track="colibry"><span class="tab-index">01</span><span><b data-en="Smart Video Sensor" data-fr="Capteur vidéo intelligent">Smart Video Sensor</b><small>ColibryNPU EvalBoardTiny</small></span><span class="tab-arrow">↗</span></button>
        <button class="track-tab" data-track="alif"><span class="tab-index">02</span><span><b data-en="Wildlife Monitoring" data-fr="Surveillance de la faune">Wildlife Monitoring</b><small>Alif Ensemble E7 kit</small></span><span class="tab-arrow">↗</span></button>
        <button class="track-tab" data-track="space"><span class="tab-index">03</span><span><b data-en="Aidge in Space" data-fr="Aidge dans l’espace">Aidge in Space</b><small>CPU / FPGA carrier</small></span><span class="tab-arrow">↗</span></button>
      </nav>

      <section class="workbench-grid">
        <article class="panel board-panel">
          <div class="panel-heading"><div><span class="eyebrow" id="hardware-explorer-label">HARDWARE EXPLORER</span><h2 id="board-heading">ColibryNPU EvalBoardTiny</h2></div><div class="heading-actions"><span class="schematic-tag" id="model-scale-label">SCALE NOT CALIBRATED</span><button class="expand-button" id="expand-view-button">EXPAND VIEW ⛶</button></div></div>
          <div class="board-stage"><canvas id="board-canvas" aria-label="Interactive 3D board model; drag to orbit and click components"></canvas><div class="board-hint"><span class="orbit-icon">⟳</span> DRAG TO ORBIT <i>·</i> SCROLL TO ZOOM <i>·</i> CLICK A COMPONENT</div><div class="board-chip-label" id="component-readout">SELECT A COMPONENT</div></div>
          <div class="component-strip" id="component-strip"></div>
          <p class="disclaimer-line" id="geometry-disclaimer">Based on ASYGN's annotated top/bottom product views. No public mechanical CAD or dimensioned drawing was found; geometry is approximate.</p>
        </article>

        <article class="panel camera-panel">
          <div class="panel-heading"><div><span class="eyebrow" id="feed-eyebrow">SYNTHETIC CAMERA FEED</span><h2>People counting</h2></div><span class="feed-status"><i></i> <span id="feed-state">RUNNING</span></span></div>
          <div class="feed-wrap"><canvas id="feed-canvas" width="640" height="360" aria-label="Synthetic video stream with animated tracking overlays"></canvas><div class="feed-overlay top-left">QQVGA · GRAYSCALE</div><div class="feed-overlay top-right" id="frame-counter">FRAME 0000</div><div class="count-pill"><small id="count-pill-label">LINE CROSSED</small><strong id="count-value">00</strong></div><div class="detect-tag" id="detect-tag"><span></span> PERSON TRACKING ACTIVE</div></div>
          <div class="feed-footer"><span><i class="mini-dot green"></i> <span id="feed-stage-a">CAMERA INPUT</span></span><span><i class="mini-dot cyan"></i> <span id="feed-stage-b">NNPA INFERENCE</span></span><span><i class="mini-dot amber"></i> <span id="feed-stage-c">MCU POST-PROCESS</span></span></div>
        </article>
      </section>

      <section class="metrics-grid" aria-label="Live pipeline estimates">
        <article class="metric-card"><div class="metric-top"><span id="accuracy-heading">DETECTION SCORE</span><span class="metric-icon">◉</span></div><div class="metric-value"><strong id="accuracy-value">—</strong><small>%</small></div><div class="metric-note"><span class="grade-pill" id="accuracy-grade">SIMULATED</span><span id="accuracy-note">confidence proxy</span></div><div class="bar-track"><i id="accuracy-bar"></i></div></article>
        <article class="metric-card"><div class="metric-top"><span id="fps-heading">PIPELINE RATE</span><span class="metric-icon">⌁</span></div><div class="metric-value"><strong id="fps-value">—</strong><small>FPS</small></div><div class="metric-note"><span class="grade-pill" id="fps-grade">SIMULATED</span><span><b id="latency-value">—</b> <span id="fps-note">ms / frame</span></span></div><div class="bar-track"><i id="fps-bar"></i></div></article>
        <article class="metric-card"><div class="metric-top"><span id="power-heading">BOARD POWER</span><span class="metric-icon">ϟ</span></div><div class="metric-value"><strong id="power-value">—</strong><small>mW</small></div><div class="metric-note"><span class="grade-pill" id="power-grade">SIMULATED</span><span id="power-goal">Colibry goal &lt; 5 mW</span></div><div class="bar-track"><i id="power-bar"></i></div></article>
        <article class="metric-card"><div class="metric-top"><span id="memory-heading">NNPA WORKING SET</span><span class="metric-icon">▦</span></div><div class="metric-value"><strong id="memory-value">—</strong><small>kB</small></div><div class="metric-note"><span class="grade-pill" id="memory-grade">SIMULATED</span><span id="memory-goal">Colibry limit 640 kB</span></div><div class="bar-track"><i id="memory-bar"></i></div></article>
      </section>

      <section class="lower-grid">
        <article class="panel controls-panel">
          <div class="panel-heading"><div><span class="eyebrow" id="controls-eyebrow">MODEL & SCENE CONTROLS</span><h2 id="controls-heading">Shape the workload</h2></div><button id="reset-button" class="text-button">RESET DEFAULTS ↺</button></div>
          <div class="control-grid">
            <label class="control-field"><span>Input resolution <b id="resolution-label">160 × 120</b></span><select id="resolution"><option value="160x120">QQVGA · 160 × 120</option><option value="320x240">QVGA · 320 × 240</option><option value="240x180">Custom · 240 × 180</option></select></label>
            <label class="control-field"><span>Quantized model size <b><i id="model-label">360</i> kB</b></span><input id="model-size" type="range" min="120" max="580" step="10" value="360"><small>Includes weights; working set is estimated separately.</small></label>
            <label class="control-field"><span>Detection confidence <b id="confidence-label">0.58</b></span><input id="confidence" type="range" min="0.1" max="0.95" step="0.01" value="0.58"><small>Higher threshold may miss small or distant people.</small></label>
            <label class="control-field"><span>Scene density <b id="density-label">MEDIUM</b></span><input id="scene-density" type="range" min="0" max="100" step="1" value="35"><small>Changes the synthetic scene and post-processing load.</small></label>
          </div>
          <div class="test-actions"><button class="primary-button" id="run-button"><span>▶</span> RUN 20-SECOND VIRTUAL TEST</button><button class="secondary-button" id="pause-button">PAUSE FEED</button><button class="secondary-button" id="export-button">EXPORT REPORT ↓</button></div>
          <div class="test-progress hidden" id="test-progress"><div><span id="test-status">Starting deterministic virtual test…</span><b id="test-clock">00:00</b></div><div class="progress-track"><i id="progress-bar"></i></div></div>
        </article>

        <article class="panel gates-panel">
          <div class="panel-heading"><div><span class="eyebrow">CHALLENGE SCORECARD</span><h2 id="scorecard-heading">Colibry target gates</h2></div><span class="estimate-badge" id="scorecard-badge">COLIBRY REFERENCE</span></div>
          <div class="gate-list" id="gate-list"></div>
          <div class="gate-footnote"><span>ⓘ</span><p id="gate-note">Official scoring is based on measured hardware results. Browser estimates cannot certify FPS, accuracy or power.</p></div>
        </article>
      </section>

      <section class="panel pipeline-panel"><div class="panel-heading"><div><span class="eyebrow" id="pipeline-eyebrow">END-TO-END EXECUTION</span><h2 id="pipeline-heading">Image-to-count pipeline</h2></div><span class="sequence-tag" id="pipeline-sequence">DEPENDENCY ORDER · LIVE TIMING</span></div><div class="pipeline-steps" id="pipeline-steps"></div></section>

      <section class="panel connection-panel"><div class="panel-heading"><div><span class="eyebrow" id="bringup-label">HARDWARE BRING-UP</span><h2 id="connection-heading">Connect a real telemetry bridge</h2></div><span class="estimate-badge" id="telemetry-badge">NO HARDWARE CONNECTED</span></div><p class="connect-copy" id="connection-copy">When the board, probe and firmware are available, connect a USB serial bridge or BLE telemetry characteristic that emits one JSON sample per image. The bench remains in estimate mode until real samples arrive.</p><div class="hardware-method"><div class="method-title"><span class="eyebrow" id="usb-method-label">USB SERIAL</span><span id="serial-status">Waiting for a device</span></div><div class="connection-row"><button class="secondary-button" id="connect-button">CONNECT USB SERIAL</button><button class="side-button scan-button" id="scan-button">SCAN AUTHORIZED PORTS</button><button class="text-button" id="disconnect-button" disabled>DISCONNECT</button></div></div><div class="hardware-method ble-method"><div class="method-title"><span class="eyebrow" id="ble-method-label">BLUETOOTH LE · CONFIGURE FROM YOUR BOARD FIRMWARE</span><span id="ble-status">Service and characteristic UUID required</span></div><div class="ble-fields"><label><span id="ble-service-label">Service UUID</span><input id="ble-service-uuid" type="text" placeholder="From your firmware / kit manual"></label><label><span id="ble-characteristic-label">Notify characteristic UUID</span><input id="ble-characteristic-uuid" type="text" placeholder="Newline-delimited JSON telemetry"></label><button class="secondary-button" id="connect-ble-button">CONNECT BLE DEVICE</button></div></div><pre class="protocol-sample">{"fps": 12.4, "power_mw": 4.1, "latency_ms": 62, "accuracy": 0.96, "memory_kb": 412, "count": 3}</pre><div class="connection-note" id="connection-note">This UI does not flash firmware or emulate the proprietary NNPA. Real inference requires the physical board and ASYGN toolchain; power needs an external calibrated meter.</div></section>

      <section class="panel log-panel"><div class="panel-heading"><div><span class="eyebrow" id="log-eyebrow">TEST EVENT LOG</span><h2 id="log-heading">Run history</h2></div><button class="text-button" id="clear-log">CLEAR LOG</button></div><div id="event-log" class="event-log" aria-live="polite"></div></section>
    </main>
    <footer><span id="footer-left">AIDGE HARDWARE LAB <i>·</i> OPEN SOURCE VIRTUAL TEST BENCH</span><span id="footer-right">THREE.JS <i>·</i> VITE <i>·</i> No manufacturer CAD or hardware performance claims</span></footer>
  </div>
  <dialog id="help-dialog" class="guide-dialog"><form method="dialog"><button class="dialog-close" aria-label="Close">×</button><span class="eyebrow" id="guide-kicker">QUICK START · 2 MINUTES</span><h2 id="guide-title">Use the virtual hardware lab</h2><div id="guide-content"></div><button class="primary-button" id="guide-close-button">GOT IT</button></form></dialog>
  <dialog id="viewer-dialog" class="viewer-dialog"><div class="viewer-shell"><header class="viewer-header"><div><span class="eyebrow" id="viewer-kicker">IMMERSIVE HARDWARE INSPECTION</span><h2 id="viewer-title">Colibry EvalBoardTiny</h2></div><button class="expand-button" id="close-viewer-button">CLOSE VIEW ×</button></header><div class="viewer-toolbar"><div class="side-tabs"><button class="side-button active" data-side="top" id="side-top-button">TOP SIDE</button><button class="side-button" data-side="bottom" id="side-bottom-button">BOTTOM SIDE</button><button class="side-button" data-side="both" id="side-both-button">ASSEMBLED</button></div><label class="explode-control"><span id="explode-label">EXPLODE COMPONENTS</span><input id="explode-slider" type="range" min="0" max="100" value="0"><b id="explode-value">0%</b></label><label class="probe-toggle"><input id="probe-toggle" type="checkbox" checked><span id="probe-label">SHOW COLIBRYPROBE</span></label><button class="side-button" id="reset-camera-button">RESET CAMERA</button></div><div class="viewer-content"><div class="viewer-canvas-wrap"><div id="viewer-canvas-slot"></div><div class="viewer-hint" id="viewer-hint">DRAG TO ORBIT · SCROLL TO ZOOM · CLICK PARTS TO INSPECT</div><div class="viewer-selection" id="viewer-selection">SELECT A COMPONENT</div></div><aside class="reference-sidebar"><div class="reference-head"><span class="eyebrow" id="reference-label">MANUFACTURER REFERENCE</span><a href="https://asygn.com/colibrynpu-evalboard/" target="_blank" rel="noreferrer" id="source-link">SOURCE ↗</a></div><div class="reference-image-wrap"><a id="exploded-image-link" href="https://asygn.com/wp-content/uploads/2026/08/Evalboard_vue_eclater_tiny.jpg" target="_blank" rel="noreferrer"><img id="exploded-image" src="https://asygn.com/wp-content/uploads/2026/08/Evalboard_vue_eclater_tiny.jpg" alt="ASYGN annotated top and bottom Colibry EvalBoardTiny and ColibryProbe reference view" loading="lazy"></a></div><div class="reference-credit" id="image-credit">Annotated product image © ASYGN. Open image for full resolution.</div><div class="selected-part-card"><span class="eyebrow" id="selected-part-label">SELECTED COMPONENT</span><h3 id="selected-part-title">ColibryNPU EvalBoardTiny</h3><p id="selected-part-description">Select a 3D component or a part name to inspect it.</p><div class="part-actions"><button class="secondary-button" id="detach-part-button" disabled>DISCONNECT PART</button><button class="secondary-button" id="reattach-part-button" disabled>RECONNECT PART</button></div><p class="part-action-status" id="part-action-status">Select a modeled part in 3D to enable virtual removal.</p><p class="part-action-note" id="part-action-note">Virtual movement only; no electrical, pin-level or physical connection is simulated.</p></div><div class="reference-caution" id="reference-caution">The image identifies subsystem placement. It does not provide mechanical dimensions, footprints, connector pinouts or a 3D assembly model.</div></aside></div></div></dialog>
`;

const $ = (selector) => document.querySelector(selector);
const state = { lang: 'en', track: 'colibry', running: true, selectedPartId: null, selectedPartDetached: false, config: { width: 160, height: 120, modelKB: 360, confidence: 0.58, sceneLoad: 0.35 }, metrics: null, hardwareMetrics: null, hardware: false, serialPort: null, reader: null, bleDevice: null, bleServer: null, bleCharacteristic: null, testTimer: null, testStartedAt: 0, people: [], crossed: 0, frame: 0, lastSpawn: 0 };

const components = {
  colibry: ['QVA image sensor', 'ColibryNPU / RISC-V + NNPA', '32-bit RISC-V CPU (integrated in ColibryNPU)', 'nRF52832 BLE', 'Digital microphone', '3-axis accelerometer', '8 Mbit external flash', 'CR927 battery', 'FPC camera connector', 'JTAG / GPIO / SPI / I2C'],
  alif: ['Alif Ensemble E7', 'Cortex-M55 + Ethos-U55', 'RGB camera input', 'LCD display', 'USB programming interface', 'LPDDR memory', 'JTAG / UART / GPIO'],
  space: ['Alif Ensemble E7', 'CPU / FPGA image pipeline', 'Camera input', 'Flash / SD storage', 'Power monitor', 'JTAG / UART / USB'],
};
const componentsFR = {
  colibry: ['Module caméra QVA', 'ColibryNPU / RISC-V + NNPA', 'CPU RISC-V 32 bits (intégré à ColibryNPU)', 'Bluetooth nRF52832', 'Microphone numérique', 'Accéléromètre 3 axes', 'Flash externe 8 Mbit', 'Pile CR927', 'Connecteur caméra FPC', 'JTAG / GPIO / SPI / I2C'],
  alif: ['SoC Alif Ensemble E7', 'Cortex-M55 + Ethos-U55', 'Entrée caméra RGB', 'Écran LCD', 'Interface USB de programmation', 'Mémoire LPDDR', 'JTAG / UART / GPIO'],
  space: ['SoC Alif Ensemble E7', 'Chaîne image CPU / FPGA', 'Entrée caméra', 'Stockage Flash / SD', 'Moniteur de puissance', 'JTAG / UART / USB'],
};
const componentPartIds = {
  colibry: ['QVA camera module / FPC flex', 'ColibryNPU chip', 'ColibryNPU chip', 'Nordic nRF52832 BLE', 'MEMS digital microphone', '3-axis accelerometer', 'External flash 8 Mbit', 'CR927 battery holder', 'Image sensor FPC connector · bottom', '2x GPIO / JTAG headers'],
  alif: ['Alif Ensemble E7 SoC', 'Ethos-U55 NPU subsystem', 'RGB camera input', 'LCD display connector', 'JTAG / USB debug', 'LPDDR memory', 'JTAG / USB debug'],
  space: ['Alif Ensemble E7 SoC', 'External FPGA module', 'Camera input', 'Flash / SD storage', 'JTAG / UART', 'JTAG / UART', 'JTAG / UART'],
};
const trackMeta = {
  colibry: { title: 'COLIBRYNPU · SMART VIDEO', board: 'ColibryNPU EvalBoardTiny', workload: { en: 'People detection & counting', fr: 'Détection et comptage de personnes' }, pipeline: { en: 'Image-to-count pipeline', fr: 'Chaîne image vers comptage' } },
  alif: { title: 'ALIF ENSEMBLE E7 · WILDLIFE', board: 'Alif Ensemble E7 Development Kit', workload: { en: 'Wildlife detection & classification', fr: 'Détection et classification de la faune' }, pipeline: { en: 'Wildlife image-to-species pipeline', fr: 'Chaîne image vers classification d’espèces' } },
  space: { title: 'CPU / FPGA · AIDGE IN SPACE', board: 'Space Edge-Compute Carrier · Concept', workload: { en: 'Image tiling & onboard inference', fr: 'Tuilage d’image et inférence embarquée' }, pipeline: { en: 'Image-to-compression pipeline', fr: 'Chaîne image vers compression' } },
};

const COPY = {
  en: {
    'intro-kicker':'EMBEDDED AI TEST ENVIRONMENT','hero-title':'Build it before<br><em>you plug it in.</em>','hero-copy':'Explore the hardware, exercise the full inference pipeline, and see how design choices move your accuracy, speed, memory and power budget.','active-target-label':'ACTIVE TARGET','hardware-explorer-label':'HARDWARE EXPLORER','model-scale-label':'APPROXIMATE · NOT TO SCALE','expand-view-button':'OPEN IMMERSIVE 3D ↗','geometry-disclaimer':'Placement follows ASYGN annotated top/bottom views. No public mechanical CAD or dimensioned drawing was found; scale and fine layout are approximate.','feed-eyebrow':'SYNTHETIC CAMERA / COMPUTE VIEW','feed-running':'RUNNING','controls-eyebrow':'MODEL & SCENE CONTROLS','controls-heading':'Shape the workload','reset-button':'RESET DEFAULTS ↺','model-size-help':'Weights shown; working set is estimated separately.','confidence-help':'A higher threshold can miss small or distant objects.','scene-density-help':'Changes synthetic scene activity and post-processing load.','run-button':'▶ RUN 20-SECOND VIRTUAL TEST','pause-button':'PAUSE FEED','resume-button':'RESUME FEED','export-button':'EXPORT REPORT ↓','scorecard-eyebrow':'CHALLENGE SCORECARD','gate-note':'Official scoring uses measured hardware results. Browser estimates cannot certify FPS, accuracy or power.','pipeline-eyebrow':'END-TO-END EXECUTION','pipeline-sequence':'DEPENDENCY ORDER · MODEL TIMING','bringup-label':'HARDWARE BRING-UP','connection-heading':'Connect a real telemetry bridge','connection-copy':'When the board, probe and firmware are available, connect a USB serial bridge or BLE telemetry characteristic that emits one JSON sample per image. The bench remains in estimate mode until real samples arrive.','connect-button':'CONNECT USB SERIAL','scan-button':'SCAN AUTHORIZED PORTS','ble-method-label':'BLUETOOTH LE · CONFIGURE FROM YOUR BOARD FIRMWARE','ble-service-label':'Service UUID','ble-characteristic-label':'Notify characteristic UUID','ble-connect-button':'CONNECT BLE DEVICE','ble-wait':'Service and characteristic UUID required','serial-wait':'Waiting for a device','serial-none-authorized':'No previously authorized ports. Use Connect to grant access; unapproved ports are not visible to the browser.','serial-ports-found':'Previously authorized serial port(s) found. Select Connect to open one.','serial-device-detected':'Authorized serial device detected. Select Connect to read it.','serial-device-removed':'Serial device disconnected.','disconnect-button':'DISCONNECT','connection-note':'This UI does not flash firmware or emulate the proprietary NNPA. Real inference requires the physical board and ASYGN toolchain; power needs an external calibrated meter.','log-eyebrow':'TEST EVENT LOG','log-heading':'Run history','clear-log':'CLEAR LOG','footer-left':'AIDGE HARDWARE LAB · OPEN SOURCE VIRTUAL TEST BENCH','footer-right':'THREE.JS · VITE · NO MANUFACTURER CAD OR HARDWARE PERFORMANCE CLAIMS','guide-button':'USER GUIDE ↗','guide-kicker':'QUICK START · 2 MINUTES','guide-title':'Use the virtual hardware lab','guide-close-button':'GOT IT','viewer-kicker':'IMMERSIVE HARDWARE INSPECTION','close-viewer-button':'CLOSE VIEW ×','side-top-button':'TOP SIDE','side-bottom-button':'BOTTOM SIDE','side-both-button':'ASSEMBLED','explode-label':'EXPLODE COMPONENTS','probe-label':'SHOW COLIBRYPROBE','reset-camera-button':'RESET CAMERA','viewer-hint':'DRAG TO ORBIT · SCROLL TO ZOOM · CLICK PARTS TO INSPECT','reference-label':'MANUFACTURER REFERENCE','source-link':'SOURCE ↗','image-credit':'Annotated product image © ASYGN. Open image for full resolution.','selected-part-label':'SELECTED COMPONENT','selected-part-description':'Select a 3D component or a part name to inspect it.','reference-caution':'The image identifies subsystem placement. It does not provide mechanical dimensions, footprints, connector pinouts or a 3D assembly model.','detach-part-button':'DISCONNECT PART','reattach-part-button':'RECONNECT PART','part-action-ready':'Selected part is virtually attached.','part-action-detached':'Virtually disconnected from its mounting position.','part-action-select':'Select a component in the 3D model to enable virtual removal.','part-action-note':'Virtual movement only; no electrical, pin-level or physical connection is simulated.','goal-accuracy':'Detection score > 95%','goal-fps':'Frame rate > 10 FPS','goal-power':'Power < 5 mW','goal-memory':'Model + input < 640 kB','memory-heading':'NNPA WORKING SET','memory-goal':'Colibry limit 640 kB','power-heading':'BOARD POWER','power-goal':'Colibry goal < 5 mW','scorecard-colibry':'Colibry target gates','scorecard-reference':'Colibry reference gates','scorecard-colibry-badge':'COLIBRY REFERENCE','scorecard-other-badge':'NOT CALIBRATED FOR THIS BOARD','scorecard-other-note':'These limits come from the Colibry challenge brief. There is no calibrated Alif or FPGA performance model; treat cross-track figures as illustrative only.','image-error':'Could not load the ASYGN image. Open the manufacturer source link to view it.','source-selection':'SELECT A COMPONENT','track-log':'Hardware profile changed to','live-connected':'USB TELEMETRY BRIDGE · CONNECTED','live-estimates':'VIRTUAL BENCH · LIVE ESTIMATES','telemetry-wait':'WAITING FOR MEASUREMENTS','telemetry-live':'LIVE HARDWARE DATA','telemetry-none':'NO HARDWARE CONNECTED','serial-connected':'Connected · waiting for JSON telemetry lines','serial-disconnected':'Disconnected','serial-unavailable':'Web Serial is unavailable. Use Chrome or Edge over localhost/HTTPS.','serial-selected-none':'No serial port selected.','serial-error':'Connection failed:','serial-read-error':'Serial read stopped:','test-start-estimate':'Running browser-side virtual workload…','test-start-hardware':'Collecting device telemetry…','test-complete-estimate':'Virtual test complete · estimates only.','test-complete-hardware':'Hardware telemetry window complete.','test-log-start':'test started','test-log-complete':'20-second test complete','log-initial':'Virtual test bench initialized. All performance values are model estimates.','log-active':'Active board profile: ColibryNPU EvalBoardTiny · Smart Video Sensor.','pause-log':'Camera preview paused.','resume-log':'Camera preview resumed.','report-exported':'Test report exported as JSON.','serial-log':'USB serial telemetry bridge connected at 115200 baud.','serial-unavailable-log':'USB serial is unavailable in this browser.','serial-disconnected-log':'USB telemetry bridge disconnected.','virtual-note':'Only physical board measurements can validate official challenge results. The synthetic scene is not an accuracy benchmark.','fps-label':'PIPELINE RATE','accuracy-label':'DETECTION SCORE','feed-frame':'FRAME','line-crossed':'LINE CROSSED','synthetic-events':'SYNTHETIC EVENTS','estimated-source':'SIMULATED','measured-source':'MEASURED','waiting-source':'WAITING','power-proxy':'POWER PROXY','memory-proxy':'MODEL MEMORY PROXY','no-calibrated-target':'No calibrated target','unknown-board-memory':'Board-specific limit unknown','pipeline-acquisition':'IMAGE ACQUISITION','pipeline-preprocess':'PRE-PROCESSING','pipeline-inference':'NNPA INFERENCE','pipeline-postprocess':'POST-PROCESSING','pipeline-output':'RESULT OUTPUT','pipeline-camera':'CAMERA / FPC','pipeline-gray':'GRAYSCALE · RESIZE','pipeline-ops':'UINT8 · SUPPORTED OPS','pipeline-track':'FILTER · TRACK · COUNT','pipeline-ble':'BLE / UART BRIDGE','pipeline-rgb':'RGB CAMERA','pipeline-normalize':'RESIZE / NORMALIZE','pipeline-ethos':'ETHOS-U INFERENCE','pipeline-species':'SPECIES CLASSIFIER','pipeline-lcd':'LCD / USB','pipeline-tile':'TILE / COMPRESS','pipeline-memory':'MEMORY BOUNDED','pipeline-fpga':'CPU / FPGA INFERENCE','pipeline-packet':'PACKET / REASSEMBLE','pipeline-store':'STORAGE / DOWNLINK','pipeline-device':'DEVICE PIPELINE','not-reported':'NOT REPORTED','end-latency':'END-TO-END LATENCY','measured-telemetry':'MEASURED TELEMETRY','frame-counter-prefix':'FRAME','feed-stage-camera':'CAMERA INPUT','feed-stage-rgb':'RGB CAMERA INPUT','feed-stage-image':'IMAGE INPUT','feed-stage-gray':'GRAYSCALE · RESIZE','feed-stage-mcu':'MCU POST-PROCESS','feed-stage-tile':'TILE / REASSEMBLE','reset-log':'Workload controls restored to the planning baseline.','log-clear':'Event log cleared.','test-log-finish':'20-second test complete','virtual-log-start':'Virtual test started','hardware-log-start':'Hardware telemetry test started','report-log':'Test report exported as JSON.','paused-status':'PAUSED','low':'LOW','medium':'MEDIUM','high':'HIGH'
  },
  fr: {
    'intro-kicker':'BANC DE TEST POUR IA EMBARQUÉE','hero-title':'Préparez le matériel<br><em>avant de le brancher.</em>','hero-copy':'Explorez le matériel, parcourez la chaîne d’inférence et observez l’effet des choix de conception sur la précision, la vitesse, la mémoire et le budget énergétique.','active-target-label':'CIBLE ACTIVE','hardware-explorer-label':'EXPLORATEUR MATÉRIEL','model-scale-label':'APPROXIMATIF · HORS ÉCHELLE','expand-view-button':'OUVRIR LA 3D IMMERSIVE ↗','geometry-disclaimer':'Placement repris des vues annotées recto/verso d’ASYGN. Aucune CAO mécanique ni vue cotée publique trouvée ; l’échelle et les détails restent approximatifs.','feed-eyebrow':'VUE CAMÉRA / CALCUL SYNTHÉTIQUE','feed-running':'EN COURS','controls-eyebrow':'CONTRÔLES DU MODÈLE ET DE LA SCÈNE','controls-heading':'Réglez la charge de travail','reset-button':'RÉINITIALISER ↺','model-size-help':'Poids indiqués ; l’ensemble de travail est estimé séparément.','confidence-help':'Un seuil élevé peut ignorer les objets petits ou éloignés.','scene-density-help':'Modifie l’activité synthétique et la charge de post-traitement.','run-button':'▶ LANCER LE TEST VIRTUEL · 20 S','pause-button':'METTRE EN PAUSE','resume-button':'REPRENDRE','export-button':'EXPORTER LE RAPPORT ↓','scorecard-eyebrow':'OBJECTIFS DU CHALLENGE','gate-note':'Le score officiel repose sur des mesures matérielles. Le navigateur ne certifie ni FPS, ni précision, ni consommation.','pipeline-eyebrow':'EXÉCUTION DE BOUT EN BOUT','pipeline-sequence':'ORDRE DES DÉPENDANCES · TEMPS MODÉLISÉS','bringup-label':'MISE EN SERVICE MATÉRIELLE','connection-heading':'Connecter un pont de télémétrie réel','connection-copy':'Avec la carte, la sonde et le firmware, connectez un pont série USB ou une caractéristique BLE qui émet une mesure JSON par image. Le banc reste en mode estimation jusqu’à réception de mesures réelles.','connect-button':'CONNECTER LE PORT SÉRIE USB','scan-button':'RECHERCHER LES PORTS AUTORISÉS','ble-method-label':'BLUETOOTH LE · CONFIGURATION DU FIRMWARE REQUISE','ble-service-label':'UUID du service','ble-characteristic-label':'UUID de la caractéristique de notification','ble-connect-button':'CONNECTER UN APPAREIL BLE','ble-wait':'UUID du service et de la caractéristique requis','serial-wait':'En attente d’un appareil','serial-none-authorized':'Aucun port déjà autorisé. Utilisez Connecter pour accorder l’accès ; le navigateur masque les ports non autorisés.','serial-ports-found':'Port(s) série déjà autorisé(s). Cliquez sur Connecter pour en ouvrir un.','serial-device-detected':'Appareil série autorisé détecté. Cliquez sur Connecter pour le lire.','serial-device-removed':'Appareil série déconnecté.','disconnect-button':'DÉCONNECTER','connection-note':'Cette interface ne programme pas le firmware et n’émule pas le NNPA propriétaire. L’inférence réelle exige la carte physique et les outils ASYGN ; la puissance exige un wattmètre étalonné.','log-eyebrow':'JOURNAL DES TESTS','log-heading':'Historique des exécutions','clear-log':'EFFACER LE JOURNAL','footer-left':'AIDGE HARDWARE LAB · BANC DE TEST VIRTUEL OPEN SOURCE','footer-right':'THREE.JS · VITE · SANS CAO FABRICANT NI PROMESSE DE PERFORMANCE','guide-button':'GUIDE UTILISATEUR ↗','guide-kicker':'DÉMARRAGE RAPIDE · 2 MIN','guide-title':'Utiliser le banc matériel virtuel','guide-close-button':'COMPRIS','viewer-kicker':'INSPECTION IMMERSIVE DU MATÉRIEL','close-viewer-button':'FERMER ×','side-top-button':'FACE SUPÉRIEURE','side-bottom-button':'FACE INFÉRIEURE','side-both-button':'ASSEMBLÉE','explode-label':'ÉCLATER LES COMPOSANTS','probe-label':'AFFICHER COLIBRYPROBE','reset-camera-button':'RÉINITIALISER LA VUE','viewer-hint':'GLISSER POUR ORBITER · MOLETTE POUR ZOOMER · CLIQUER POUR INSPECTER','reference-label':'RÉFÉRENCE FABRICANT','source-link':'SOURCE ↗','image-credit':'Image annotée © ASYGN. Ouvrir pour la résolution complète.','selected-part-label':'COMPOSANT SÉLECTIONNÉ','selected-part-description':'Sélectionnez un composant 3D ou un nom pour l’inspecter.','reference-caution':'L’image indique le placement des sous-systèmes. Elle ne fournit ni dimensions mécaniques, ni empreintes, ni brochages, ni modèle 3D d’assemblage.','detach-part-button':'DÉBRANCHER LA PIÈCE','reattach-part-button':'REBRANCHER LA PIÈCE','part-action-ready':'La pièce est virtuellement en place.','part-action-detached':'Pièce virtuellement séparée de son emplacement.','part-action-select':'Sélectionnez une pièce 3D pour activer son retrait virtuel.','part-action-note':'Mouvement visuel uniquement : aucun brochage, circuit électrique ou contact réel n’est simulé.','goal-accuracy':'Score de détection > 95 %','goal-fps':'Débit > 10 FPS','goal-power':'Puissance < 5 mW','goal-memory':'Modèle + entrée < 640 ko','memory-heading':'ENSEMBLE DE TRAVAIL NNPA','memory-goal':'Limite Colibry : 640 ko','power-heading':'PUISSANCE DE LA CARTE','power-goal':'Objectif Colibry : < 5 mW','scorecard-colibry':'Objectifs Colibry','scorecard-reference':'Objectifs de référence Colibry','scorecard-colibry-badge':'RÉFÉRENCE COLIBRY','scorecard-other-badge':'NON CALIBRÉ POUR CETTE CARTE','scorecard-other-note':'Ces limites viennent du brief Colibry. Aucun modèle de performance Alif ou FPGA calibré n’est disponible ; les autres profils sont illustratifs.','image-error':'Image ASYGN indisponible. Ouvrez le lien fabricant pour la consulter.','source-selection':'SÉLECTIONNEZ UN COMPOSANT','track-log':'Profil matériel sélectionné :','live-connected':'PONT DE TÉLÉMÉTRIE USB · CONNECTÉ','live-estimates':'BANC VIRTUEL · ESTIMATIONS EN DIRECT','telemetry-wait':'EN ATTENTE DE MESURES','telemetry-live':'MESURES MATÉRIELLES EN DIRECT','telemetry-none':'AUCUN MATÉRIEL CONNECTÉ','serial-connected':'Connecté · en attente de lignes JSON','serial-disconnected':'Déconnecté','serial-unavailable':'Port série Web indisponible. Utilisez Chrome ou Edge sur localhost/HTTPS.','serial-selected-none':'Aucun port série sélectionné.','serial-error':'Échec de connexion :','serial-read-error':'Lecture série interrompue :','test-start-estimate':'Exécution de la charge virtuelle dans le navigateur…','test-start-hardware':'Collecte de la télémétrie…','test-complete-estimate':'Test virtuel terminé · estimations uniquement.','test-complete-hardware':'Fenêtre de télémétrie matérielle terminée.','test-log-start':'test démarré','test-log-complete':'test de 20 secondes terminé','log-initial':'Banc virtuel initialisé. Toutes les performances sont estimées.','log-active':'Profil actif : ColibryNPU EvalBoardTiny · capteur vidéo intelligent.','pause-log':'Aperçu caméra en pause.','resume-log':'Aperçu caméra repris.','report-exported':'Rapport de test exporté en JSON.','serial-log':'Pont série USB connecté à 115200 bauds.','serial-unavailable-log':'Port série USB indisponible dans ce navigateur.','serial-disconnected-log':'Pont de télémétrie USB déconnecté.','virtual-note':'Seules les mesures de la carte physique valident les résultats officiels. La scène synthétique n’est pas un benchmark de précision.','fps-label':'DÉBIT DE LA CHAÎNE','accuracy-label':'SCORE DE DÉTECTION','feed-frame':'IMAGE','line-crossed':'PASSAGES COMPTÉS','synthetic-events':'ÉVÉNEMENTS SYNTHÉTIQUES','estimated-source':'SIMULÉ','measured-source':'MESURÉ','waiting-source':'EN ATTENTE','power-proxy':'INDICATEUR DE PUISSANCE','memory-proxy':'INDICATEUR MÉMOIRE MODÈLE','no-calibrated-target':'Aucune cible calibrée','unknown-board-memory':'Limite spécifique inconnue','pipeline-acquisition':'ACQUISITION IMAGE','pipeline-preprocess':'PRÉTRAITEMENT','pipeline-inference':'INFÉRENCE NNPA','pipeline-postprocess':'POST-TRAITEMENT','pipeline-output':'SORTIE RÉSULTAT','pipeline-camera':'CAMÉRA / FPC','pipeline-gray':'NIVEAUX DE GRIS · REDIMENSION','pipeline-ops':'UINT8 · OPÉRATEURS SUPPORTÉS','pipeline-track':'FILTRER · SUIVRE · COMPTER','pipeline-ble':'PONT BLE / UART','pipeline-rgb':'CAMÉRA RGB','pipeline-normalize':'REDIMENSION / NORMALISATION','pipeline-ethos':'INFÉRENCE ETHOS-U','pipeline-species':'CLASSIFICATION D’ESPÈCES','pipeline-lcd':'LCD / USB','pipeline-tile':'TUILES / COMPRESSION','pipeline-memory':'MÉMOIRE BORNÉE','pipeline-fpga':'INFÉRENCE CPU / FPGA','pipeline-packet':'PAQUET / RÉASSEMBLAGE','pipeline-store':'STOCKAGE / LIAISON DESCENDANTE','pipeline-device':'CHAÎNE DE TRAITEMENT','not-reported':'NON TRANSMIS','end-latency':'LATENCE DE BOUT EN BOUT','measured-telemetry':'TÉLÉMÉTRIE MESURÉE','frame-counter-prefix':'IMAGE','feed-stage-camera':'ENTRÉE CAMÉRA','feed-stage-rgb':'ENTRÉE CAMÉRA RGB','feed-stage-image':'ENTRÉE IMAGE','feed-stage-gray':'NIVEAUX DE GRIS · REDIMENSION','feed-stage-mcu':'POST-TRAITEMENT MCU','feed-stage-tile':'TUILES / RÉASSEMBLAGE','reset-log':'Paramètres restaurés aux valeurs de référence.','log-clear':'Journal effacé.','test-log-finish':'test de 20 secondes terminé','virtual-log-start':'Test virtuel démarré','hardware-log-start':'Test de télémétrie matérielle démarré','report-log':'Rapport de test exporté en JSON.','paused-status':'EN PAUSE','low':'FAIBLE','medium':'MOYENNE','high':'ÉLEVÉE'
  }
};

const t = (key) => COPY[state.lang][key] ?? COPY.en[key] ?? key;

function translateUI() {
  document.documentElement.lang = state.lang;
  $('#language-button').textContent = state.lang === 'en' ? 'FRANÇAIS' : 'ENGLISH';
  $('#help-button').textContent = t('guide-button');
  $('#connect-ble-button').textContent = t('ble-connect-button');
  for (const key of ['intro-kicker','hero-copy','active-target-label','hardware-explorer-label','model-scale-label','expand-view-button','geometry-disclaimer','feed-eyebrow','controls-eyebrow','controls-heading','reset-button','pipeline-eyebrow','pipeline-sequence','bringup-label','connection-heading','connection-copy','connect-button','scan-button','ble-method-label','ble-service-label','ble-characteristic-label','disconnect-button','connection-note','log-eyebrow','log-heading','clear-log','footer-left','footer-right','guide-kicker','guide-title','guide-close-button','viewer-kicker','close-viewer-button','side-top-button','side-bottom-button','side-both-button','explode-label','probe-label','reset-camera-button','viewer-hint','reference-label','source-link','image-credit','selected-part-label','selected-part-description','reference-caution','detach-part-button','reattach-part-button']) {
    const el = $(`#${key}`);
    if (el) el.textContent = t(key);
  }
  $('#hero-title').innerHTML = t('hero-title');
  $('#part-action-note').textContent = t('part-action-note');
  $('#accuracy-heading').textContent = t('accuracy-label');
  $('#fps-heading').textContent = t('fps-label');
  $('#accuracy-note').textContent = state.lang === 'en' ? 'confidence proxy' : 'indicateur de confiance';
  $('#fps-note').textContent = state.lang === 'en' ? 'ms / frame' : 'ms / image';
  $('.metric-card:nth-child(3) #power-heading').textContent = t('power-heading');
  $('.metric-card:nth-child(3) #power-goal').textContent = t('power-goal');
  $('.metric-card:nth-child(4) #memory-heading').textContent = t('memory-heading');
  $('.metric-card:nth-child(4) #memory-goal').textContent = t('memory-goal');
  $('.gates-panel .eyebrow').textContent = t('scorecard-eyebrow');
  $('.feed-overlay.top-left').textContent = state.lang === 'en' ? 'QQVGA · GRAYSCALE' : 'QQVGA · NIVEAUX DE GRIS';
  $('#detect-tag').innerHTML = `<span></span> ${state.lang === 'en' ? 'PERSON TRACKING DEMO' : 'DÉMO DE SUIVI DE PERSONNES'}`;
  $('.dialog-close').setAttribute('aria-label', state.lang === 'en' ? 'Close' : 'Fermer');
  $('#serial-status').textContent = state.serialPort ? t('serial-connected') : t('serial-wait');
  if (!state.bleDevice) $('#ble-status').textContent = t('ble-wait');
  $('#ble-service-uuid').placeholder = state.lang === 'en' ? 'From firmware / kit manual' : 'Indiqué par le firmware / manuel';
  $('#ble-characteristic-uuid').placeholder = state.lang === 'en' ? 'Newline-delimited JSON telemetry' : 'Télémétrie JSON délimitée par des retours ligne';
  $('#guide-content').innerHTML = state.lang === 'en'
    ? `<ol class="guide-steps"><li><b>Choose a challenge track.</b><span>Colibry is the detailed primary board; Alif and Space are illustrative profiles.</span></li><li><b>Inspect the 3D board.</b><span>Drag to orbit, scroll to zoom, click a part, or open the immersive viewer for top/bottom views and exploded components.</span></li><li><b>Change the workload.</b><span>Adjust resolution, model size, confidence and scene density. The counters and model estimates update live.</span></li><li><b>Run and export.</b><span>Start the 20-second virtual run, then export its JSON planning report.</span></li><li><b>Test real hardware.</b><span>Connect a firmware/host bridge that streams the documented JSON telemetry. Use a physical labelled test set for accuracy and a calibrated meter for power.</span></li></ol><p class="guide-warning">The synthetic view is not an AI detector. The 3D is not manufacturer CAD and is not millimetre-accurate.</p>`
    : `<ol class="guide-steps"><li><b>Choisissez une piste.</b><span>Colibry est la carte principale détaillée ; Alif et Space sont des profils illustratifs.</span></li><li><b>Inspectez la carte en 3D.</b><span>Glissez pour orbiter, faites défiler pour zoomer, cliquez sur un composant ou ouvrez la vue immersive pour voir les faces et éclater les composants.</span></li><li><b>Modifiez la charge.</b><span>Réglez la résolution, la taille du modèle, le seuil de confiance et la densité. Les compteurs et estimations évoluent en direct.</span></li><li><b>Lancez et exportez.</b><span>Démarrez le test virtuel de 20 secondes, puis exportez le rapport JSON de planification.</span></li><li><b>Testez le matériel réel.</b><span>Connectez un pont logiciel/carte qui transmet la télémétrie JSON documentée. Utilisez un jeu de test étiqueté pour la précision et un wattmètre étalonné pour la puissance.</span></li></ol><p class="guide-warning">La vue synthétique n’est pas un détecteur IA. La 3D n’est pas une CAO fabricant et n’est pas exacte au millimètre.</p>`;
  document.querySelectorAll('[data-en][data-fr]').forEach((element) => { element.textContent = element.dataset[state.lang]; });
  const meta = trackMeta[state.track];
  $('#target-name').textContent = meta.title;
  $('#target-workload').textContent = meta.workload[state.lang];
  $('#board-heading').textContent = meta.board;
  $('.camera-panel h2').textContent = meta.workload[state.lang];
  $('#pipeline-heading').textContent = meta.pipeline[state.lang];
  const optionText = state.lang === 'en'
    ? ['QQVGA · 160 × 120','QVGA · 320 × 240','Custom · 240 × 180']
    : ['QQVGA · 160 × 120','QVGA · 320 × 240','Personnalisée · 240 × 180'];
  $('#resolution').querySelectorAll('option').forEach((option,index) => { option.textContent = optionText[index]; });
  const controlLabels = state.lang === 'en'
    ? ['Input resolution','Quantized model size','Detection confidence','Scene density']
    : ['Résolution d’entrée','Taille du modèle quantifié','Seuil de confiance','Densité de la scène'];
  document.querySelectorAll('.control-field > span').forEach((label,index) => { if (controlLabels[index]) label.firstChild.textContent = controlLabels[index]; });
  const controlHelp = [t('model-size-help'),t('confidence-help'),t('scene-density-help')];
  document.querySelectorAll('.control-field small').forEach((help,index) => { if (controlHelp[index]) help.textContent = controlHelp[index]; });
  $('#resolution-label').textContent = `${state.config.width} × ${state.config.height}`;
  $('#run-button').innerHTML = `<span>▶</span> ${t('run-button').replace(/^▶\s*/, '')}`;
  $('#pause-button').textContent = state.running ? t('pause-button') : t('resume-button');
  $('#export-button').textContent = t('export-button');
  $('#scorecard-heading').textContent = state.track === 'colibry' ? t('scorecard-colibry') : t('scorecard-reference');
  $('#scorecard-badge').textContent = state.track === 'colibry' ? t('scorecard-colibry-badge') : t('scorecard-other-badge');
  $('#gate-note').textContent = state.track === 'colibry' ? t('gate-note') : t('scorecard-other-note');
  $('#count-pill-label').textContent = state.hardwareMetrics?.measuredFields?.has('count')
    ? (state.lang === 'en' ? 'DEVICE COUNT' : 'COMPTAGE MATÉRIEL')
    : state.track === 'colibry'
      ? (state.lang === 'en' ? 'SYNTHETIC LINE CROSSED' : 'PASSAGES SYNTHÉTIQUES')
      : t('synthetic-events');
  $('#feed-stage-a').textContent = state.track === 'colibry' ? (state.lang === 'en'?'CAMERA INPUT':'ENTRÉE CAMÉRA') : state.track === 'alif' ? (state.lang === 'en'?'RGB CAMERA INPUT':'ENTRÉE CAMÉRA RGB') : (state.lang === 'en'?'IMAGE INPUT':'ENTRÉE IMAGE');
  $('#feed-stage-b').textContent = state.track === 'colibry' ? t('pipeline-inference') : state.track === 'alif' ? t('pipeline-ethos') : (state.lang === 'en'?'CPU / FPGA':'CPU / FPGA');
  $('#feed-stage-c').textContent = state.track === 'colibry' ? (state.lang === 'en'?'MCU POST-PROCESS':'POST-TRAITEMENT MCU') : state.track === 'alif' ? t('pipeline-species') : (state.lang === 'en'?'TILE / REASSEMBLE':'TUILE / RÉASSEMBLAGE');
  $('#detect-tag').innerHTML = `<span></span> ${state.track === 'colibry' ? (state.lang === 'en'?'PERSON TRACKING DEMO':'DÉMO DE SUIVI DE PERSONNES') : t('synthetic-events')}`;
  $('#feed-state').textContent = state.running ? t('feed-running') : t('pause-button');
  $('#frame-counter').textContent = `${t('frame-counter-prefix')} ${String(state.frame).padStart(4, '0')}`;
  if (!state.running) $('#pause-button').textContent = t('resume-button');
  else $('#pause-button').textContent = t('pause-button');
  $('#connection-label').textContent = state.hardware ? t('live-connected') : t('live-estimates');
  $('#telemetry-badge').textContent = state.hardwareMetrics ? t('telemetry-live') : state.hardware ? t('telemetry-wait') : t('telemetry-none');
  $('#viewer-title').textContent = meta.board;
  refreshPartActions();
  renderComponentStrip();
  updateMetrics();
}

function renderComponentStrip() {
  const items = state.lang === 'fr' ? componentsFR[state.track] : components[state.track];
  $('#component-strip').innerHTML = items.map((part, index) => `<button class="component-chip" data-component-index="${index}"><span>${String(index + 1).padStart(2, '0')}</span>${part}</button>`).join('');
  document.querySelectorAll('.component-chip').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.componentIndex);
    showComponent(items[index], componentPartIds[state.track][index], true);
  }));
}

function showComponent(name, partId = null, detachable = false) {
  const rows = [
    ['camera', 'Camera sensor and flex connection', 'Capteur caméra et connexion souple', 'The annotated board views identify the camera interface and an image-sensor FPC connector. The exact sensor module and connector specification must be checked against the kit documentation.', 'Les vues annotées indiquent l’interface caméra et un connecteur FPC pour le capteur. Le modèle exact du capteur et le brochage sont à vérifier dans la documentation du kit.'],
    ['colibry', 'ColibryNPU accelerator', 'Accélérateur ColibryNPU', 'The on-device neural-network accelerator. A browser scene cannot emulate its instruction set, memory timing or power.', 'Accélérateur de réseau neuronal embarqué. La scène du navigateur n’émule ni son jeu d’instructions, ni ses temps mémoire, ni sa consommation.'],
    ['risc-v', '32-bit RISC-V CPU integrated in the ColibryNPU', 'CPU RISC-V 32 bits intégré à ColibryNPU', 'ASYGN describes the RISC-V CPU and NNPA as part of the Colibry processor. The CPU is not represented as a separate physical package.', 'ASYGN décrit le CPU RISC-V et le NNPA comme les éléments du processeur Colibry. Le CPU n’est pas représenté comme un composant physique séparé.'],
    ['accelerometer', '3-axis accelerometer', 'Accéléromètre 3 axes', 'Motion sensor listed in ASYGN’s EvalBoardTiny specifications. Exact part number and axes calibration require the board datasheet.', 'Capteur de mouvement indiqué dans les caractéristiques ASYGN de l’EvalBoardTiny. La référence et le calibrage nécessitent la fiche technique.'],
    ['battery', 'CR927 battery holder', 'Support de pile CR927', 'Mechanical holder shown in the manufacturer’s top-side reference. Use the approved cell and polarity from the board manual.', 'Support de pile visible sur la vue fabricant. Utilisez la pile et la polarité précisées dans le manuel de la carte.'],
    ['nordic', 'BLE radio module', 'Module radio BLE', 'The product specification lists a Nordic nRF52832 and a 2.4 GHz antenna on the underside.', 'La fiche produit indique un Nordic nRF52832 et une antenne 2,4 GHz au verso.'],
    ['microphone', 'MEMS microphone', 'Microphone MEMS', 'Digital microphone shown on the underside product reference. Its exact bus and firmware driver are kit-specific.', 'Microphone numérique visible au verso. Son bus et le pilote logiciel dépendent du kit.'],
    ['antenna', '2.4 GHz antenna', 'Antenne 2,4 GHz', 'BLE antenna region identified on the underside reference. The 3D metal pattern is illustrative.', 'Zone de l’antenne BLE indiquée sur la vue verso. Le motif métallique 3D est illustratif.'],
    ['probe', 'ColibryProbe debug adapter', 'Adaptateur de débogage ColibryProbe', 'Separate programming/debug board in ASYGN’s exploded image. It is not part of the EvalBoardTiny PCB; check the kit manual for its exact wiring.', 'Carte de programmation/débogage distincte sur l’image éclatée ASYGN. Elle ne fait pas partie du PCB EvalBoardTiny ; consultez le manuel pour le câblage.'],
    ['header', 'Board interface connector', 'Connecteur d’interface', 'A connector family is shown in the manufacturer image. This viewer does not claim pin-accurate geometry or electrical pinout.', 'La vue fabricant montre une famille de connecteurs. Cette visualisation ne prétend pas représenter les dimensions ou brochages avec précision.'],
  ];
  const row = rows.find(([key]) => name.toLowerCase().includes(key));
  const title = row ? row[state.lang === 'en' ? 1 : 2] : name;
  const description = row ? row[state.lang === 'en' ? 3 : 4] : (state.lang === 'en' ? 'Illustrative component based on the annotated manufacturer view; confirm its exact part and dimensions in the protected kit documentation.' : 'Composant illustratif d’après la vue fabricant annotée ; vérifiez sa référence et ses dimensions dans la documentation du kit.');
  state.selectedPartId = detachable ? partId : null;
  state.selectedPartDetached = state.selectedPartId ? boardScene.isPartDetached(state.selectedPartId) : false;
  boardScene.setSelectedPart(state.selectedPartId);
  $('#component-readout').textContent = title.toUpperCase();
  $('#viewer-selection').textContent = title.toUpperCase();
  $('#selected-part-title').textContent = title;
  $('#selected-part-description').textContent = description;
  refreshPartActions();
  addLog(`${state.lang === 'en' ? 'Component selected' : 'Composant sélectionné'} : ${title}`, 'info');
}

function refreshPartActions() {
  const selectable = Boolean(state.selectedPartId);
  $('#detach-part-button').disabled = !selectable || state.selectedPartDetached;
  $('#reattach-part-button').disabled = !selectable || !state.selectedPartDetached;
  $('#part-action-status').textContent = !selectable ? t('part-action-select') : state.selectedPartDetached ? t('part-action-detached') : t('part-action-ready');
}

const boardScene = createBoardScene($('#board-canvas'), showComponent);
renderComponentStrip();

const originalCanvasParent = $('#board-canvas').parentElement;
$('#expand-view-button').addEventListener('click', () => {
  $('#viewer-canvas-slot').append($('#board-canvas'));
  $('#explode-slider').value = '0'; $('#explode-value').textContent = '0%'; boardScene.setExplode(0);
  $('#viewer-dialog').showModal();
  $('#viewer-title').textContent = trackMeta[state.track].board;
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
});
$('#close-viewer-button').addEventListener('click', () => $('#viewer-dialog').close());
$('#viewer-dialog').addEventListener('close', () => {
  originalCanvasParent.prepend($('#board-canvas'));
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
});
document.querySelectorAll('.side-button[data-side]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.side-button[data-side]').forEach((item) => item.classList.toggle('active', item === button));
  boardScene.setSide(button.dataset.side);
}));
$('#explode-slider').addEventListener('input', (event) => {
  const value = Number(event.target.value);
  $('#explode-value').textContent = `${value}%`;
  boardScene.setExplode(value / 100);
});
$('#probe-toggle').addEventListener('change', (event) => boardScene.setProbeVisible(event.target.checked));
$('#reset-camera-button').addEventListener('click', () => boardScene.resetView());
$('#detach-part-button').addEventListener('click', () => {
  if (!state.selectedPartId || !boardScene.setPartDetached(state.selectedPartId, true)) return;
  state.selectedPartDetached = true;
  refreshPartActions();
});
$('#reattach-part-button').addEventListener('click', () => {
  if (!state.selectedPartId || !boardScene.setPartDetached(state.selectedPartId, false)) return;
  state.selectedPartDetached = false;
  refreshPartActions();
});
$('#exploded-image').addEventListener('error', () => {
  $('#exploded-image').hidden = true;
  $('#image-credit').textContent = t('image-error');
});

$('#language-button').addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'fr' : 'en';
  translateUI();
  addLog(state.lang === 'en' ? 'Interface language set to English.' : 'Langue de l’interface : français.', 'info');
});
$('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
function updateMetrics() {
  state.metrics = state.hardware && state.hardwareMetrics ? state.hardwareMetrics : estimatePipeline(state.config);
  const m = state.metrics;
  const measuredFields = state.hardwareMetrics?.measuredFields || new Set();
  const measured = measuredFields.size > 0;
  $('#accuracy-value').textContent = (m.detectionScore * 100).toFixed(1);
  $('#fps-value').textContent = m.fps.toFixed(1);
  $('#power-value').textContent = m.powerMw.toFixed(2);
  $('#memory-value').textContent = m.peakMemoryKB.toFixed(0);
  $('#latency-value').textContent = m.pipelineMs.toFixed(1);
  const sourceLabel = (field, estimateLabel) => measuredFields.has(field) ? t('measured-source') : state.hardware && !measured ? t('waiting-source') : estimateLabel;
  $('#accuracy-grade').textContent = sourceLabel('detectionScore', m.scoreBand);
  $('#fps-grade').textContent = sourceLabel('fps', m.fpsBand);
  $('#power-grade').textContent = sourceLabel('powerMw', m.powerBand);
  $('#memory-grade').textContent = sourceLabel('peakMemoryKB', m.memoryPass ? (state.lang === 'en'?'WITHIN LIMIT':'DANS LA LIMITE') : (state.lang === 'en'?'OVER LIMIT':'LIMITE DÉPASSÉE'));
  $('#power-heading').textContent = state.track === 'colibry' ? t('power-heading') : t('power-proxy');
  $('#power-goal').textContent = state.track === 'colibry' ? t('power-goal') : t('no-calibrated-target');
  $('#memory-heading').textContent = state.track === 'colibry' ? t('memory-heading') : t('memory-proxy');
  $('#memory-goal').textContent = state.track === 'colibry' ? t('memory-goal') : t('unknown-board-memory');
  document.querySelectorAll('.metric-card').forEach((card, index) => {
    const field = ['detectionScore','fps','powerMw','peakMemoryKB'][index];
    card.dataset.source = measuredFields.has(field) ? 'hardware' : 'estimate';
  });
  $('#accuracy-bar').style.width = `${Math.min(100, m.detectionScore * 100)}%`;
  $('#fps-bar').style.width = `${Math.min(100, (m.fps / 20) * 100)}%`;
  $('#power-bar').style.width = `${Math.min(100, (m.powerMw / 10) * 100)}%`;
  $('#memory-bar').style.width = `${Math.min(100, (m.peakMemoryKB / LIMITS.npuMemoryKB) * 100)}%`;
  $('#power-bar').classList.toggle('over', m.powerMw >= 5);
  $('#memory-bar').classList.toggle('over', !m.memoryPass);
  const goalKeys = { accuracy: 'goal-accuracy', fps: 'goal-fps', power: 'goal-power', memory: 'goal-memory' };
  $('#gate-list').innerHTML = getGoalStatus(m).map((goal) => `<div class="gate-row ${goal.pass ? 'pass' : 'fail'}"><span class="gate-check">${goal.pass ? '✓' : '×'}</span><span>${t(goalKeys[goal.key])}</span><b>${goal.value}</b></div>`).join('');
  const colibryStages = [
    ['01', t('pipeline-acquisition'), t('pipeline-camera'), 8 + (m.width * m.height) / (160 * 120) * 3.5],
    ['02', t('pipeline-preprocess'), t('pipeline-gray'), 5.2 + (m.width * m.height) / (160 * 120) * 2.1],
    ['03', t('pipeline-inference'), t('pipeline-ops'), m.inferenceMs],
    ['04', t('pipeline-postprocess'), t('pipeline-track'), m.postprocessMs],
    ['05', t('pipeline-output'), t('pipeline-ble'), 3.4],
  ];
  const alifStages = [
    ['01', t('pipeline-acquisition'), t('pipeline-rgb'), 8 + (m.width * m.height) / (160 * 120) * 3.5],
    ['02', t('pipeline-preprocess'), t('pipeline-normalize'), 5.2 + (m.width * m.height) / (160 * 120) * 2.1],
    ['03', t('pipeline-ethos'), 'TOSA · UINT8', m.inferenceMs],
    ['04', t('pipeline-species'), t('pipeline-postprocess'), m.postprocessMs],
    ['05', t('pipeline-output'), t('pipeline-lcd'), 3.4],
  ];
  const spaceStages = [
    ['01', t('pipeline-acquisition'), t('pipeline-camera'), 8 + (m.width * m.height) / (160 * 120) * 3.5],
    ['02', t('pipeline-tile'), t('pipeline-memory'), 5.2 + (m.width * m.height) / (160 * 120) * 2.1],
    ['03', t('pipeline-fpga'), 'MODEL DEPENDENT', m.inferenceMs],
    ['04', t('pipeline-packet'), t('pipeline-postprocess'), m.postprocessMs],
    ['05', t('pipeline-output'), t('pipeline-store'), 3.4],
  ];
  const stages = measured ? [
    ['01', t('pipeline-acquisition'), t('pipeline-device'), null],
    ['02', t('pipeline-preprocess'), t('not-reported'), null],
    ['03', t('end-latency'), measuredFields.has('pipelineMs') ? t('measured-telemetry') : t('not-reported'), measuredFields.has('pipelineMs') ? m.pipelineMs : null],
    ['04', t('pipeline-postprocess'), t('not-reported'), null],
    ['05', t('pipeline-output'), t('not-reported'), null],
  ] : state.track === 'alif' ? alifStages : state.track === 'space' ? spaceStages : colibryStages;
  $('#pipeline-steps').innerHTML = stages.map((stage, index) => `<div class="pipeline-step"><span class="step-index">${stage[0]}</span><strong>${stage[1]}</strong><small>${stage[2]}</small><b>${stage[3] == null ? '—' : stage[3].toFixed(1)} <i>ms</i></b>${index < stages.length - 1 ? '<span class="step-arrow">→</span>' : ''}</div>`).join('');
}

function addLog(message, type = 'info') {
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const row = document.createElement('div');
  row.className = `log-row ${type}`;
  row.innerHTML = `<time>${time}</time><span class="log-marker"></span><span>${message}</span>`;
  $('#event-log').prepend(row);
  while ($('#event-log').children.length > 40) $('#event-log').lastElementChild.remove();
}

function readControls() {
  const [width, height] = $('#resolution').value.split('x').map(Number);
  state.config.width = width;
  state.config.height = height;
  state.config.modelKB = Number($('#model-size').value);
  state.config.confidence = Number($('#confidence').value);
  state.config.sceneLoad = Number($('#scene-density').value) / 100;
  $('#resolution-label').textContent = `${width} × ${height}`;
  $('#model-label').textContent = state.config.modelKB;
  $('#confidence-label').textContent = state.config.confidence.toFixed(2);
  const density = state.config.sceneLoad;
  $('#density-label').textContent = density < 0.25 ? 'LOW' : density < 0.65 ? 'MEDIUM' : 'HIGH';
  updateMetrics();
}

['resolution', 'model-size', 'confidence', 'scene-density'].forEach((id) => $(`#${id}`).addEventListener('input', readControls));

document.querySelectorAll('.track-tab').forEach((button) => button.addEventListener('click', () => {
  state.track = button.dataset.track;
  state.selectedPartId = null; state.selectedPartDetached = false; boardScene.setSelectedPart(null);
  document.querySelectorAll('.track-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
  const meta = trackMeta[state.track];
  $('#target-name').textContent = meta.title;
  $('#target-workload').textContent = meta.workload[state.lang];
  $('#board-heading').textContent = meta.board;
  $('.camera-panel h2').textContent = meta.workload[state.lang];
  $('#pipeline-heading').textContent = meta.pipeline || 'Image-to-count pipeline';
  $('#scorecard-heading').textContent = state.track === 'colibry' ? t('scorecard-colibry') : t('scorecard-reference');
  $('#scorecard-badge').textContent = state.track === 'colibry' ? t('scorecard-colibry-badge') : t('scorecard-other-badge');
  $('#gate-note').textContent = state.track === 'colibry' ? t('gate-note') : t('scorecard-other-note');
  $('#count-pill-label').textContent = state.track === 'colibry' ? 'LINE CROSSED' : 'SYNTHETIC EVENTS';
  $('#detect-tag').innerHTML = `<span></span> ${state.track === 'colibry' ? 'PERSON TRACKING DEMO' : 'GENERIC SYNTHETIC SCENE'}`;
  $('#feed-stage-a').textContent = state.track === 'colibry' ? 'CAMERA INPUT' : state.track === 'alif' ? 'RGB CAMERA INPUT' : 'IMAGE INPUT';
  $('#feed-stage-b').textContent = state.track === 'colibry' ? 'NNPA INFERENCE' : state.track === 'alif' ? 'ETHOS-U INFERENCE' : 'CPU / FPGA';
  $('#feed-stage-c').textContent = state.track === 'colibry' ? 'MCU POST-PROCESS' : state.track === 'alif' ? 'SPECIES CLASSIFIER' : 'TILE / REASSEMBLE';
  state.people = [];
  state.crossed = 0;
  $('#count-value').textContent = '00';
  boardScene.setTrack(state.track);
  renderComponentStrip();
  refreshPartActions();
  updateMetrics();
  $('#viewer-title').textContent = meta.board;
  addLog(`${t('track-log')} ${meta.board}.`, 'info');
}));

$('#reset-button').addEventListener('click', () => {
  $('#resolution').value = '160x120';
  $('#model-size').value = '360';
  $('#confidence').value = '0.58';
  $('#scene-density').value = '35';
  readControls();
  addLog('Workload controls restored to the planning baseline.', 'success');
});

$('#pause-button').addEventListener('click', (event) => {
  state.running = !state.running;
  event.currentTarget.textContent = state.running ? 'PAUSE FEED' : 'RESUME FEED';
  $('#feed-state').textContent = state.running ? 'RUNNING' : 'PAUSED';
  $('#detect-tag').style.opacity = state.running ? '1' : '.3';
  boardScene.setActivity(state.running);
});

function startVirtualTest() {
  if (state.testTimer) clearInterval(state.testTimer);
  state.testStartedAt = Date.now();
  $('#test-progress').classList.remove('hidden');
  $('#run-button').disabled = true;
  $('#test-status').textContent = state.hardware ? 'Collecting device telemetry…' : 'Running browser-side virtual workload…';
  addLog(`${state.hardware ? 'Hardware' : 'Virtual'} test started · ${state.config.width}×${state.config.height} · ${state.config.modelKB} kB model.`, 'info');
  state.testTimer = setInterval(() => {
    const elapsed = (Date.now() - state.testStartedAt) / 1000;
    $('#test-clock').textContent = `00:${String(Math.min(20, Math.floor(elapsed))).padStart(2, '0')}`;
    $('#progress-bar').style.width = `${Math.min(100, elapsed / 20 * 100)}%`;
    if (elapsed >= 20) {
      clearInterval(state.testTimer);
      state.testTimer = null;
      $('#run-button').disabled = false;
      $('#test-status').textContent = state.hardware ? t('test-complete-hardware') : t('test-complete-estimate');
      addLog(`20-second test complete · ${state.metrics.fps.toFixed(1)} FPS estimate · ${state.metrics.powerMw.toFixed(2)} mW estimate.`, 'success');
    }
  }, 100);
}

$('#run-button').addEventListener('click', startVirtualTest);

$('#export-button').addEventListener('click', () => {
  const reportMetrics = state.hardwareMetrics ? {
    fps: state.metrics.fps,
    powerMw: state.metrics.powerMw,
    latencyMs: state.metrics.pipelineMs,
    accuracy: state.metrics.detectionScore,
    memoryKB: state.metrics.peakMemoryKB,
    count: state.crossed,
    measuredFields: [...state.hardwareMetrics.measuredFields],
  } : state.metrics;
  const report = { generatedAt: new Date().toISOString(), track: { id: state.track, title: trackMeta[state.track].title, board: trackMeta[state.track].board, workload: trackMeta[state.track].workload[state.lang] }, language: state.lang, source: state.hardwareMetrics ? 'hardware telemetry bridge' : 'browser estimate', metrics: reportMetrics, goals: getGoalStatus(state.metrics), note: t('virtual-note') };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aidge-${state.track}-test-${new Date().toISOString().replaceAll(':', '-')}.json`;
  link.click();
  URL.revokeObjectURL(url);
  addLog('Test report exported as JSON.', 'success');
});

$('#clear-log').addEventListener('click', () => { $('#event-log').replaceChildren(); addLog('Event log cleared.', 'info'); });
async function connectSerial() {
  if (!('serial' in navigator)) {
    $('#serial-status').textContent = 'Web Serial is unavailable. Use Chrome or Edge over localhost/HTTPS.';
    addLog('USB serial is unavailable in this browser.', 'warn');
    return;
  }
  try {
    state.serialPort = await navigator.serial.requestPort();
    await state.serialPort.open({ baudRate: 115200 });
    state.hardware = true;
    $('#connection-label').textContent = t('live-connected');
    $('#telemetry-badge').textContent = t('telemetry-wait');
    $('#telemetry-badge').classList.add('connected');
    $('#serial-status').textContent = t('serial-connected');
    $('#disconnect-button').disabled = false;
    addLog('USB serial telemetry bridge connected at 115200 baud.', 'success');
    readSerialLines(state.serialPort);
  } catch (error) {
    $('#serial-status').textContent = error.name === 'NotFoundError' ? t('serial-selected-none') : `${t('serial-error')} ${error.message}`;
  }
}

async function scanSerialPorts() {
  if (!('serial' in navigator)) { $('#serial-status').textContent = t('serial-unavailable'); return; }
  try {
    const ports = await navigator.serial.getPorts();
    $('#serial-status').textContent = ports.length ? t('serial-ports-found') : t('serial-none-authorized');
    addLog(`${ports.length} ${state.lang === 'en' ? 'previously authorized serial port(s).' : 'port(s) série déjà autorisé(s).'}`, 'info');
  } catch (error) { $('#serial-status').textContent = `${t('serial-error')} ${error.message}`; }
}

if ('serial' in navigator) {
  navigator.serial.addEventListener('connect', () => {
    $('#serial-status').textContent = t('serial-device-detected');
    addLog(t('serial-device-detected'), 'info');
  });
  navigator.serial.addEventListener('disconnect', (event) => {
    if (event.target === state.serialPort) {
      state.serialPort = null;
      disconnectHardwareState();
    }
    $('#serial-status').textContent = t('serial-device-removed');
  });
}

async function connectBle() {
  if (!navigator.bluetooth) {
    $('#ble-status').textContent = state.lang === 'en' ? 'Web Bluetooth is unavailable in this browser.' : 'Web Bluetooth est indisponible dans ce navigateur.';
    return;
  }
  const serviceId = $('#ble-service-uuid').value.trim();
  const characteristicId = $('#ble-characteristic-uuid').value.trim();
  if (!serviceId || !characteristicId) {
    $('#ble-status').textContent = state.lang === 'en' ? 'Enter the service and notify UUIDs from your firmware or kit manual.' : 'Saisissez les UUID du service et de notification indiqués par le firmware ou le manuel.';
    return;
  }
  try {
    state.bleDevice = await navigator.bluetooth.requestDevice({ filters: [{ services: [serviceId] }], optionalServices: [serviceId] });
    state.bleDevice.addEventListener('gattserverdisconnected', onBleDisconnected);
    state.bleServer = await state.bleDevice.gatt.connect();
    const service = await state.bleServer.getPrimaryService(serviceId);
    state.bleCharacteristic = await service.getCharacteristic(characteristicId);
    await state.bleCharacteristic.startNotifications();
    const decoder = new TextDecoder();
    let buffer = '';
    state.bleCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
      const value = event.target.value;
      buffer += decoder.decode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength), { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const sample = parseTelemetryLine(buffer.slice(0, newline).replace(/\r$/, ''));
        buffer = buffer.slice(newline + 1);
        if (sample) applyHardwareSample(sample);
      }
      if (buffer.length > 4096) buffer = buffer.slice(-1024);
    });
    state.hardware = true;
    $('#connection-label').textContent = t('live-connected');
    $('#telemetry-badge').textContent = t('telemetry-wait');
    $('#telemetry-badge').classList.add('connected');
    $('#ble-status').textContent = `${state.bleDevice.name || 'BLE device'} · ${state.lang === 'en' ? 'connected; waiting for JSON samples' : 'connecté ; en attente des mesures JSON'}`;
    $('#disconnect-button').disabled = false;
    updateMetrics();
    addLog(state.lang === 'en' ? 'BLE telemetry connected; waiting for newline-delimited JSON.' : 'Télémétrie BLE connectée ; attente de lignes JSON.', 'success');
  } catch (error) {
    $('#ble-status').textContent = `${t('serial-error')} ${error.message}`;
  }
}

function onBleDisconnected() {
  if (!state.serialPort) disconnectHardwareState();
  $('#ble-status').textContent = t('serial-device-removed');
}

function disconnectHardwareState() {
  state.hardware = false;
  state.hardwareMetrics = null;
  $('#connection-label').textContent = t('live-estimates');
  $('#telemetry-badge').textContent = t('telemetry-none');
  $('#telemetry-badge').classList.remove('connected');
  $('#disconnect-button').disabled = true;
  $('#count-pill-label').textContent = state.track === 'colibry' ? (state.lang === 'en' ? 'SYNTHETIC LINE CROSSED' : 'PASSAGES SYNTHÉTIQUES') : t('synthetic-events');
  updateMetrics();
}

async function readSerialLines(port) {
  const decoder = new TextDecoderStream();
  const closed = port.readable.pipeTo(decoder.writable).catch(() => {});
  state.reader = decoder.readable.getReader();
  let buffer = '';
  try {
    while (state.hardware && state.reader) {
      const { value, done } = await state.reader.read();
      if (done) break;
      buffer += value;
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const sample = parseTelemetryLine(line);
        if (sample) applyHardwareSample(sample);
      }
      if (buffer.length > 4096) buffer = buffer.slice(-1024);
    }
  } catch (error) {
    if (state.hardware) addLog(`Serial read stopped: ${error.message}`, 'warn');
  } finally {
    state.reader?.releaseLock();
    state.reader = null;
    await closed;
  }
}

function applyHardwareSample(sample) {
  const previous = state.hardwareMetrics || state.metrics;
  const measuredFields = new Set(state.hardwareMetrics?.measuredFields || []);
  for (const [field, value] of Object.entries({
    fps: sample.fps,
    powerMw: sample.powerMw,
    pipelineMs: sample.latencyMs,
    detectionScore: sample.accuracy,
    peakMemoryKB: sample.memoryKB,
  })) if (value != null) measuredFields.add(field);
  state.hardwareMetrics = {
    ...previous,
    measuredFields,
    fps: sample.fps ?? previous.fps,
    powerMw: sample.powerMw ?? previous.powerMw,
    pipelineMs: sample.latencyMs ?? previous.pipelineMs,
    detectionScore: sample.accuracy ?? previous.detectionScore,
    peakMemoryKB: sample.memoryKB ?? previous.peakMemoryKB,
    memoryPass: (sample.memoryKB ?? previous.peakMemoryKB) <= LIMITS.npuMemoryKB,
    isEstimate: false,
  };
  if (sample.count != null) { state.crossed = sample.count; $('#count-value').textContent = String(sample.count).padStart(2, '0'); }
  $('#count-pill-label').textContent = measuredFields.has('count')
    ? (state.lang === 'en' ? 'DEVICE COUNT' : 'COMPTAGE MATÉRIEL')
    : (state.lang === 'en' ? 'SYNTHETIC LINE CROSSED' : 'PASSAGES SYNTHÉTIQUES');
  $('#telemetry-badge').textContent = t('telemetry-live');
  updateMetrics();
}

$('#connect-button').addEventListener('click', connectSerial);
$('#scan-button').addEventListener('click', scanSerialPorts);
$('#connect-ble-button').addEventListener('click', connectBle);
$('#disconnect-button').addEventListener('click', async () => {
  state.hardware = false;
  state.hardwareMetrics = null;
  try { await state.reader?.cancel(); } catch {}
  try { await state.serialPort?.close(); } catch {}
  try { if (state.bleDevice?.gatt?.connected) state.bleDevice.gatt.disconnect(); } catch {}
  state.serialPort = null;
  state.bleDevice = null; state.bleServer = null; state.bleCharacteristic = null;
  $('#connection-label').textContent = t('live-estimates');
  $('#telemetry-badge').textContent = t('telemetry-none');
  $('#telemetry-badge').classList.remove('connected');
  $('#disconnect-button').disabled = true;
  $('#serial-status').textContent = t('serial-disconnected');
  $('#ble-status').textContent = t('ble-wait');
  $('#count-pill-label').textContent = state.track === 'colibry' ? (state.lang === 'en' ? 'SYNTHETIC LINE CROSSED' : 'PASSAGES SYNTHÉTIQUES') : t('synthetic-events');
  updateMetrics();
  addLog('USB telemetry bridge disconnected.', 'info');
});

const feed = $('#feed-canvas');
const ctx = feed.getContext('2d');
function spawnPerson(now) {
  const fromLeft = Math.random() > 0.5;
  const h = 70 + Math.random() * 90;
  state.people.push({ x: fromLeft ? -45 : feed.width + 45, y: 305 + Math.random() * 14, h, w: h * (0.25 + Math.random() * 0.12), speed: (0.7 + Math.random() * 1.5) * (fromLeft ? 1 : -1), tracked: Math.random() < state.metrics.detectionScore, crossed: false, id: Math.floor(Math.random() * 1000), born: now });
}
function drawPerson(person, now) {
  const { x, y, h, w } = person;
  const head = h * 0.17;
  ctx.fillStyle = '#5a625d';
  ctx.beginPath();
  ctx.ellipse(x, y - h + head * 0.5, head * 0.47, head * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#747d76';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.37, y - h + head);
  ctx.lineTo(x + w * 0.37, y - h + head);
  ctx.lineTo(x + w * 0.56, y - h * 0.35);
  ctx.lineTo(x + w * 0.35, y - h * 0.31);
  ctx.lineTo(x + w * 0.25, y - h * 0.1);
  ctx.lineTo(x + w * 0.14, y);
  ctx.lineTo(x - w * 0.14, y);
  ctx.lineTo(x - w * 0.25, y - h * 0.1);
  ctx.lineTo(x - w * 0.35, y - h * 0.31);
  ctx.lineTo(x - w * 0.56, y - h * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#505853';
  ctx.fillRect(x - w * 0.22, y - h * 0.12, w * 0.17, h * 0.12);
  ctx.fillRect(x + w * 0.05, y - h * 0.12, w * 0.17, h * 0.12);
  if (person.tracked) {
    const top = y - h - 5;
    ctx.strokeStyle = '#69e7b1';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - w * 0.7, top, w * 1.4, h + 9);
    ctx.fillStyle = '#69e7b1';
    ctx.font = '11px monospace';
    ctx.fillText(`ID ${String(person.id).padStart(3, '0')} · ${(0.91 + Math.sin(now / 500 + person.id) * 0.05).toFixed(2)}`, x - w * 0.7, top - 6);
  }
}
function drawFeed(now) {
  const w = feed.width; const h = feed.height;
  ctx.fillStyle = '#1d2421'; ctx.fillRect(0, 0, w, h);
  const horizon = h * 0.39;
  const gradient = ctx.createLinearGradient(0, 0, 0, horizon);
  gradient.addColorStop(0, '#303a35'); gradient.addColorStop(1, '#545b54');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = '#383d37'; ctx.fillRect(0, horizon, w, h - horizon);
  // Low-contrast street perspective and a simulated virtual counting line.
  ctx.strokeStyle = '#62685f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w * 0.5, horizon); ctx.lineTo(0, h); ctx.moveTo(w * 0.5, horizon); ctx.lineTo(w, h); ctx.stroke();
  ctx.setLineDash([9, 8]); ctx.strokeStyle = '#dbb664'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w * 0.16, h * 0.77); ctx.lineTo(w * 0.87, h * 0.77); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 6; i += 1) { const px = (i * 117 + 33) % w; ctx.fillStyle = '#60665d'; ctx.fillRect(px, horizon + 8, 4, 50 + (i % 3) * 18); }
  if (state.track === 'colibry' && state.running) {
    const maxPeople = 1 + Math.floor(state.config.sceneLoad * 7);
    if (now - state.lastSpawn > Math.max(450, 2300 - state.config.sceneLoad * 1200) && state.people.length < maxPeople) { spawnPerson(now); state.lastSpawn = now; }
    state.people.forEach((person) => {
      person.x += person.speed;
      const line = w * 0.51;
      if (!person.crossed && (person.speed > 0 ? person.x > line : person.x < line)) {
        person.crossed = true;
        if (person.tracked && !state.hardwareMetrics?.measuredFields?.has('count')) { state.crossed += 1; $('#count-value').textContent = String(state.crossed).padStart(2, '0'); }
      }
      drawPerson(person, now);
    });
    state.people = state.people.filter((person) => person.x > -100 && person.x < w + 100);
    state.frame += 1;
  } else if (state.track === 'colibry') {
    state.people.forEach((person) => drawPerson(person, now));
  } else {
    // Alternate challenge tracks use a generic compute-flow visualization, not fake wildlife or space detections.
    const pulse = state.running ? (now / 1000) % 1 : (state.frame % 90) / 90;
    const nodes = [[0.2, 0.48], [0.42, 0.35], [0.62, 0.52], [0.82, 0.4]];
    ctx.strokeStyle = '#59685f'; ctx.lineWidth = 3;
    ctx.beginPath();
    nodes.forEach(([nx, ny], index) => {
      const x = nx * w; const y = ny * h;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    nodes.forEach(([nx, ny], index) => {
      const x = nx * w; const y = ny * h;
      const active = Math.abs(pulse - index / (nodes.length - 1)) < 0.15;
      ctx.fillStyle = active ? '#70e7b2' : '#69746d';
      ctx.beginPath(); ctx.arc(x, y, active ? 13 : 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b4c0b8'; ctx.font = '12px monospace';
      ctx.fillText(state.track === 'alif' ? ['CAMERA', 'DETECT', 'CLASSIFY', 'LCD'][index] : ['FRAME', 'TILE', 'INFER', 'STORE'][index], x - 31, y + 35);
    });
    if (state.running) state.frame += 1;
  }
  // Grayscale camera grain and scanline overlay.
  ctx.fillStyle = 'rgba(212,220,211,.035)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = 'rgba(8,12,10,.12)'; ctx.fillRect(0, 0, w, h);
  $('#frame-counter').textContent = `${t('frame-counter-prefix')} ${String(state.frame).padStart(4, '0')}`;
  requestAnimationFrame(drawFeed);
}

translateUI();
readControls();
boardScene.setActivity(true);
drawFeed(0);
addLog('Virtual test bench initialized. All performance values are model estimates.', 'success');
addLog('Active board profile: ColibryNPU EvalBoardTiny · Smart Video Sensor.', 'info');
