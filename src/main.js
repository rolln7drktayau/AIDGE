import './styles.css';
import { createBoardScene } from './board-scene.js';
import { estimatePipeline, getGoalStatus, parseTelemetryLine, LIMITS } from './simulation.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="AIDGE Hardware Lab home"><span class="brand-mark">A</span><span>AIDGE <b>HARDWARE LAB</b></span></a>
      <div class="top-meta"><span class="live-dot"></span><span id="connection-label">VIRTUAL BENCH · LIVE ESTIMATES</span><span class="divider"></span><span>CHALLENGE 2026</span></div>
      <button class="icon-button" id="help-button" aria-label="About this simulator">?</button>
    </header>

    <main>
      <section class="intro-row">
        <div><div class="eyebrow"><span>01</span> EMBEDDED AI TEST ENVIRONMENT</div><h1>Build it before<br><em>you plug it in.</em></h1><p class="intro-copy">Explore the hardware, exercise the full inference pipeline, and see how design choices move your accuracy, speed, memory and power budget.</p></div>
        <div class="target-card"><span class="target-icon">◎</span><div><small>ACTIVE TARGET</small><strong id="target-name">COLIBRYNPU · SMART VIDEO</strong><span>People detection & counting</span></div></div>
      </section>

      <nav class="track-tabs" aria-label="Challenge hardware tracks">
        <button class="track-tab active" data-track="colibry"><span class="tab-index">01</span><span><b>Smart Video Sensor</b><small>ColibryNPU EvalBoardTiny</small></span><span class="tab-arrow">↗</span></button>
        <button class="track-tab" data-track="alif"><span class="tab-index">02</span><span><b>Wildlife Monitoring</b><small>Alif Ensemble E7 kit</small></span><span class="tab-arrow">↗</span></button>
        <button class="track-tab" data-track="space"><span class="tab-index">03</span><span><b>Aidge in Space</b><small>CPU / FPGA carrier</small></span><span class="tab-arrow">↗</span></button>
      </nav>

      <section class="workbench-grid">
        <article class="panel board-panel">
          <div class="panel-heading"><div><span class="eyebrow">HARDWARE EXPLORER</span><h2 id="board-heading">ColibryNPU EvalBoardTiny</h2></div><span class="schematic-tag">SCHEMATIC 3D MODEL</span></div>
          <div class="board-stage"><canvas id="board-canvas" aria-label="Interactive 3D board model; drag to orbit and click components"></canvas><div class="board-hint"><span class="orbit-icon">⟳</span> DRAG TO ORBIT <i>·</i> SCROLL TO ZOOM <i>·</i> CLICK A COMPONENT</div><div class="board-chip-label" id="component-readout">SELECT A COMPONENT</div></div>
          <div class="component-strip" id="component-strip"></div>
          <p class="disclaimer-line">Illustrative geometry based on published specifications. It is not a manufacturer CAD model or a pin-accurate board layout.</p>
        </article>

        <article class="panel camera-panel">
          <div class="panel-heading"><div><span class="eyebrow">SYNTHETIC CAMERA FEED</span><h2>People counting</h2></div><span class="feed-status"><i></i> <span id="feed-state">RUNNING</span></span></div>
          <div class="feed-wrap"><canvas id="feed-canvas" width="640" height="360" aria-label="Synthetic video stream with animated tracking overlays"></canvas><div class="feed-overlay top-left">QQVGA · GRAYSCALE</div><div class="feed-overlay top-right" id="frame-counter">FRAME 0000</div><div class="count-pill"><small id="count-pill-label">LINE CROSSED</small><strong id="count-value">00</strong></div><div class="detect-tag" id="detect-tag"><span></span> PERSON TRACKING ACTIVE</div></div>
          <div class="feed-footer"><span><i class="mini-dot green"></i> <span id="feed-stage-a">CAMERA INPUT</span></span><span><i class="mini-dot cyan"></i> <span id="feed-stage-b">NNPA INFERENCE</span></span><span><i class="mini-dot amber"></i> <span id="feed-stage-c">MCU POST-PROCESS</span></span></div>
        </article>
      </section>

      <section class="metrics-grid" aria-label="Live pipeline estimates">
        <article class="metric-card"><div class="metric-top"><span>DETECTION SCORE</span><span class="metric-icon">◉</span></div><div class="metric-value"><strong id="accuracy-value">—</strong><small>%</small></div><div class="metric-note"><span class="grade-pill" id="accuracy-grade">SIMULATED</span><span>confidence proxy</span></div><div class="bar-track"><i id="accuracy-bar"></i></div></article>
        <article class="metric-card"><div class="metric-top"><span>PIPELINE RATE</span><span class="metric-icon">⌁</span></div><div class="metric-value"><strong id="fps-value">—</strong><small>FPS</small></div><div class="metric-note"><span class="grade-pill" id="fps-grade">SIMULATED</span><span><b id="latency-value">—</b> ms / frame</span></div><div class="bar-track"><i id="fps-bar"></i></div></article>
        <article class="metric-card"><div class="metric-top"><span id="power-heading">BOARD POWER</span><span class="metric-icon">ϟ</span></div><div class="metric-value"><strong id="power-value">—</strong><small>mW</small></div><div class="metric-note"><span class="grade-pill" id="power-grade">SIMULATED</span><span id="power-goal">Colibry goal &lt; 5 mW</span></div><div class="bar-track"><i id="power-bar"></i></div></article>
        <article class="metric-card"><div class="metric-top"><span id="memory-heading">NNPA WORKING SET</span><span class="metric-icon">▦</span></div><div class="metric-value"><strong id="memory-value">—</strong><small>kB</small></div><div class="metric-note"><span class="grade-pill" id="memory-grade">SIMULATED</span><span id="memory-goal">Colibry limit 640 kB</span></div><div class="bar-track"><i id="memory-bar"></i></div></article>
      </section>

      <section class="lower-grid">
        <article class="panel controls-panel">
          <div class="panel-heading"><div><span class="eyebrow">MODEL & SCENE CONTROLS</span><h2>Shape the workload</h2></div><button id="reset-button" class="text-button">RESET DEFAULTS ↺</button></div>
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

      <section class="panel pipeline-panel"><div class="panel-heading"><div><span class="eyebrow">END-TO-END EXECUTION</span><h2 id="pipeline-heading">Image-to-count pipeline</h2></div><span class="sequence-tag">DEPENDENCY ORDER · LIVE TIMING</span></div><div class="pipeline-steps" id="pipeline-steps"></div></section>

      <section class="panel connection-panel"><div class="panel-heading"><div><span class="eyebrow">HARDWARE BRING-UP</span><h2>Connect a real telemetry bridge</h2></div><span class="estimate-badge" id="telemetry-badge">NO HARDWARE CONNECTED</span></div><p class="connect-copy">When you have the evaluation board, probe and firmware, connect a USB serial bridge that emits one JSON telemetry object per line. Until then, this bench stays in clearly marked estimate mode.</p><div class="connection-row"><button class="secondary-button" id="connect-button">CONNECT USB SERIAL</button><span id="serial-status">Waiting for a device</span><button class="text-button" id="disconnect-button" disabled>DISCONNECT</button></div><pre class="protocol-sample">{"fps": 12.4, "power_mw": 4.1, "latency_ms": 62, "accuracy": 0.96, "memory_kb": 412, "count": 3}</pre><div class="connection-note">The simulator does not flash firmware or emulate the proprietary NNPA. Board programming and power measurement still require the ASYGN probe, Colibry EvalBoard, and a physical power meter.</div></section>

      <section class="panel log-panel"><div class="panel-heading"><div><span class="eyebrow">TEST EVENT LOG</span><h2>Run history</h2></div><button class="text-button" id="clear-log">CLEAR LOG</button></div><div id="event-log" class="event-log" aria-live="polite"></div></section>
    </main>
    <footer><span>AIDGE HARDWARE LAB <i>·</i> OPEN SOURCE VIRTUAL TEST BENCH</span><span>THREE.JS <i>·</i> VITE <i>·</i> No manufacturer CAD or hardware performance claims</span></footer>
  </div>
  <dialog id="help-dialog"><form method="dialog"><button class="dialog-close" aria-label="Close">×</button><span class="eyebrow">SIMULATOR SCOPE</span><h2>What this bench can and cannot do</h2><p>This is a browser-based 3D planning and workload simulator derived from the supplied AIDGE challenge briefs and public board specifications. The board geometry is illustrative. Latency, FPS, detection score, power and working-set figures are model estimates until a physical board sends measured telemetry.</p><p>The virtual camera stream is generated locally. It demonstrates line crossing and tracking states; it is not a trained person detector and does not validate the challenge accuracy metric.</p><p>Hardware programming, proprietary NNPA emulation, sensor drivers and calibrated power measurement require the physical target board, its probe, ASYGN toolchain and the relevant confidential/device-specific materials.</p><button class="primary-button">UNDERSTOOD</button></form></dialog>
`;

const $ = (selector) => document.querySelector(selector);
const state = { track: 'colibry', running: true, config: { width: 160, height: 120, modelKB: 360, confidence: 0.58, sceneLoad: 0.35 }, metrics: null, hardwareMetrics: null, hardware: false, serialPort: null, reader: null, testTimer: null, testStartedAt: 0, people: [], crossed: 0, frame: 0, lastSpawn: 0 };

const components = {
  colibry: ['QVA image sensor', 'ColibryNPU / NNPA', '32-bit RISC-V MCU', 'nRF52832 BLE', 'Digital microphone', '3-axis accelerometer', '8 Mbit external flash', 'CR927 battery', 'FPC camera connector', 'JTAG / GPIO / SPI / I2C'],
  alif: ['Alif Ensemble E7', 'Cortex-M55 + Ethos-U55', 'RGB camera input', 'LCD display', 'USB programming interface', 'LPDDR memory', 'JTAG / UART / GPIO'],
  space: ['Alif Ensemble E7', 'CPU / FPGA image pipeline', 'Camera input', 'Flash / SD storage', 'Power monitor', 'JTAG / UART / USB'],
};
const trackMeta = {
  colibry: { title: 'COLIBRYNPU · SMART VIDEO', board: 'ColibryNPU EvalBoardTiny', workload: 'People detection & counting' },
  alif: { title: 'ALIF ENSEMBLE E7 · WILDLIFE', board: 'Alif Ensemble E7 Development Kit', workload: 'Wildlife detection & classification', pipeline: 'Wildlife image-to-species pipeline' },
  space: { title: 'CPU / FPGA · AIDGE IN SPACE', board: 'Space Edge-Compute Carrier · Concept', workload: 'Image tiling & onboard inference', pipeline: 'Image-to-compression pipeline' },
};

function renderComponentStrip() {
  $('#component-strip').innerHTML = components[state.track].map((part, index) => `<button class="component-chip" data-component="${part}"><span>${String(index + 1).padStart(2, '0')}</span>${part}</button>`).join('');
  document.querySelectorAll('.component-chip').forEach((button) => button.addEventListener('click', () => showComponent(button.dataset.component)));
}

function showComponent(name) {
  $('#component-readout').textContent = name.toUpperCase();
  addLog(`Component selected: ${name}`, 'info');
}

const boardScene = createBoardScene($('#board-canvas'), showComponent);
renderComponentStrip();

function updateMetrics() {
  state.metrics = state.hardware && state.hardwareMetrics ? state.hardwareMetrics : estimatePipeline(state.config);
  const m = state.metrics;
  const measured = Boolean(state.hardwareMetrics);
  const prefix = measured ? 'hardware' : 'estimate';
  $('#accuracy-value').textContent = (m.detectionScore * 100).toFixed(1);
  $('#fps-value').textContent = m.fps.toFixed(1);
  $('#power-value').textContent = m.powerMw.toFixed(2);
  $('#memory-value').textContent = m.peakMemoryKB.toFixed(0);
  $('#latency-value').textContent = m.pipelineMs.toFixed(1);
  $('#accuracy-grade').textContent = measured ? 'MEASURED' : state.hardware ? 'WAITING' : m.scoreBand;
  $('#fps-grade').textContent = measured ? 'MEASURED' : state.hardware ? 'WAITING' : m.fpsBand;
  $('#power-grade').textContent = measured ? 'MEASURED' : state.hardware ? 'WAITING' : m.powerBand;
  $('#memory-grade').textContent = measured ? 'MEASURED' : state.hardware ? 'WAITING' : (m.memoryPass ? 'WITHIN LIMIT' : 'OVER LIMIT');
  $('#power-heading').textContent = state.track === 'colibry' ? 'BOARD POWER' : 'POWER PROXY';
  $('#power-goal').textContent = state.track === 'colibry' ? 'Colibry goal < 5 mW' : 'No calibrated target';
  $('#memory-heading').textContent = state.track === 'colibry' ? 'NNPA WORKING SET' : 'MODEL MEMORY PROXY';
  $('#memory-goal').textContent = state.track === 'colibry' ? 'Colibry limit 640 kB' : 'Board-specific limit unknown';
  document.querySelectorAll('.metric-card').forEach((card) => card.dataset.source = prefix);
  $('#accuracy-bar').style.width = `${Math.min(100, m.detectionScore * 100)}%`;
  $('#fps-bar').style.width = `${Math.min(100, (m.fps / 20) * 100)}%`;
  $('#power-bar').style.width = `${Math.min(100, (m.powerMw / 10) * 100)}%`;
  $('#memory-bar').style.width = `${Math.min(100, (m.peakMemoryKB / LIMITS.npuMemoryKB) * 100)}%`;
  $('#power-bar').classList.toggle('over', m.powerMw >= 5);
  $('#memory-bar').classList.toggle('over', !m.memoryPass);
  $('#gate-list').innerHTML = getGoalStatus(m).map((goal) => `<div class="gate-row ${goal.pass ? 'pass' : 'fail'}"><span class="gate-check">${goal.pass ? '✓' : '×'}</span><span>${goal.label}</span><b>${goal.value}</b></div>`).join('');
  const colibryStages = [
    ['01', 'IMAGE ACQUISITION', 'CAMERA / FPC', 8 + (m.width * m.height) / (160 * 120) * 3.5],
    ['02', 'PRE-PROCESSING', 'GRAYSCALE · RESIZE', 5.2 + (m.width * m.height) / (160 * 120) * 2.1],
    ['03', 'NNPA INFERENCE', 'UINT8 · SUPPORTED OPS', m.inferenceMs],
    ['04', 'POST-PROCESSING', 'FILTER · TRACK · COUNT', m.postprocessMs],
    ['05', 'RESULT OUTPUT', 'BLE / UART BRIDGE', 3.4],
  ];
  const alifStages = [
    ['01', 'CAMERA ACQUISITION', 'RGB CAMERA', 8 + (m.width * m.height) / (160 * 120) * 3.5],
    ['02', 'PRE-PROCESSING', 'RESIZE / NORMALIZE', 5.2 + (m.width * m.height) / (160 * 120) * 2.1],
    ['03', 'ETHOS-U INFERENCE', 'TOSA · UINT8', m.inferenceMs],
    ['04', 'SPECIES CLASSIFIER', 'POST-PROCESSING', m.postprocessMs],
    ['05', 'RESULT OUTPUT', 'LCD / USB', 3.4],
  ];
  const spaceStages = [
    ['01', 'IMAGE ACQUISITION', 'CAMERA / SENSOR', 8 + (m.width * m.height) / (160 * 120) * 3.5],
    ['02', 'TILE / COMPRESS', 'MEMORY BOUNDED', 5.2 + (m.width * m.height) / (160 * 120) * 2.1],
    ['03', 'CPU / FPGA INFERENCE', 'MODEL DEPENDENT', m.inferenceMs],
    ['04', 'PACKET / REASSEMBLE', 'IMAGE PIPELINE', m.postprocessMs],
    ['05', 'RESULT OUTPUT', 'STORAGE / DOWNLINK', 3.4],
  ];
  const stages = measured ? [
    ['01', 'CAMERA ACQUISITION', 'DEVICE PIPELINE', null],
    ['02', 'PRE-PROCESSING', 'NOT REPORTED', null],
    ['03', 'END-TO-END LATENCY', 'MEASURED TELEMETRY', m.pipelineMs],
    ['04', 'POST-PROCESSING', 'NOT REPORTED', null],
    ['05', 'RESULT OUTPUT', 'NOT REPORTED', null],
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
  document.querySelectorAll('.track-tab').forEach((tab) => tab.classList.toggle('active', tab === button));
  const meta = trackMeta[state.track];
  $('#target-name').textContent = meta.title;
  $('#board-heading').textContent = meta.board;
  $('.camera-panel h2').textContent = meta.workload;
  $('#pipeline-heading').textContent = meta.pipeline || 'Image-to-count pipeline';
  $('#scorecard-heading').textContent = state.track === 'colibry' ? 'Colibry target gates' : 'Colibry reference gates';
  $('#scorecard-badge').textContent = state.track === 'colibry' ? 'COLIBRY REFERENCE' : 'NOT CALIBRATED FOR THIS BOARD';
  $('#gate-note').textContent = state.track === 'colibry'
    ? 'Official scoring is based on measured hardware results. Browser estimates cannot certify FPS, accuracy or power.'
    : 'These limits come from the Colibry challenge brief. This simulator has no calibrated Alif or FPGA performance model; treat all cross-track figures as illustrative only.';
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
  updateMetrics();
  addLog(`Hardware profile changed to ${meta.board}.`, 'info');
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
      $('#test-status').textContent = state.hardware ? 'Hardware telemetry window complete.' : 'Virtual test complete · estimates only.';
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
  } : state.metrics;
  const report = { generatedAt: new Date().toISOString(), track: trackMeta[state.track], source: state.hardwareMetrics ? 'hardware telemetry bridge' : 'browser estimate', metrics: reportMetrics, goals: getGoalStatus(state.metrics), note: 'Only physical board measurements can validate official challenge results. The synthetic camera is not an accuracy benchmark.' };
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
$('#help-button').addEventListener('click', () => $('#help-dialog').showModal());

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
    $('#connection-label').textContent = 'USB TELEMETRY BRIDGE · CONNECTED';
    $('#telemetry-badge').textContent = 'WAITING FOR MEASUREMENTS';
    $('#telemetry-badge').classList.add('connected');
    $('#serial-status').textContent = 'Connected · waiting for JSON telemetry lines';
    $('#disconnect-button').disabled = false;
    addLog('USB serial telemetry bridge connected at 115200 baud.', 'success');
    readSerialLines(state.serialPort);
  } catch (error) {
    $('#serial-status').textContent = error.name === 'NotFoundError' ? 'No serial port selected.' : `Connection failed: ${error.message}`;
  }
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
  state.hardwareMetrics = {
    ...state.metrics,
    fps: sample.fps ?? state.metrics.fps,
    powerMw: sample.powerMw ?? state.metrics.powerMw,
    pipelineMs: sample.latencyMs ?? state.metrics.pipelineMs,
    detectionScore: sample.accuracy ?? state.metrics.detectionScore,
    peakMemoryKB: sample.memoryKB ?? state.metrics.peakMemoryKB,
    memoryPass: (sample.memoryKB ?? state.metrics.peakMemoryKB) <= LIMITS.npuMemoryKB,
    isEstimate: false,
  };
  if (sample.count != null) { state.crossed = sample.count; $('#count-value').textContent = String(sample.count).padStart(2, '0'); }
  $('#telemetry-badge').textContent = 'LIVE HARDWARE DATA';
  updateMetrics();
}

$('#connect-button').addEventListener('click', connectSerial);
$('#disconnect-button').addEventListener('click', async () => {
  state.hardware = false;
  state.hardwareMetrics = null;
  try { await state.reader?.cancel(); } catch {}
  try { await state.serialPort?.close(); } catch {}
  state.serialPort = null;
  $('#connection-label').textContent = 'VIRTUAL BENCH · LIVE ESTIMATES';
  $('#telemetry-badge').textContent = 'NO HARDWARE CONNECTED';
  $('#telemetry-badge').classList.remove('connected');
  $('#disconnect-button').disabled = true;
  $('#serial-status').textContent = 'Disconnected';
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
        if (person.tracked) { state.crossed += 1; $('#count-value').textContent = String(state.crossed).padStart(2, '0'); }
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
  $('#frame-counter').textContent = `FRAME ${String(state.frame).padStart(4, '0')}`;
  requestAnimationFrame(drawFeed);
}

readControls();
boardScene.setActivity(true);
drawFeed(0);
addLog('Virtual test bench initialized. All performance values are model estimates.', 'success');
addLog('Active board profile: ColibryNPU EvalBoardTiny · Smart Video Sensor.', 'info');
