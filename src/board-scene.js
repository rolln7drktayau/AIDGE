import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Dimensions are normalized scene units. ASYGN does not publish the board's
// mechanical CAD/dimensions publicly; do not interpret these as millimetres.
const C = { pcb: 0x102c36, mask: 0x123944, trace: 0x24906e, copper: 0xc59a55, gold: 0xd5b56f, dark: 0x121a1d, chip: 0x151c20, silk: 0xb6d0c6, mint: 0x5af0b0 };

export function createBoardScene(canvas, onComponent) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#071014');
  scene.fog = new THREE.Fog('#071014', 13, 34);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(6.3, 5.8, 7.4);

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
  catch { return { setTrack() {}, setActivity() {}, setExplode() {}, setSide() {}, setProbeVisible() {}, dispose() {} }; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.target.set(0, 0.3, 0);
  controls.minDistance = 3.4;
  controls.maxDistance = 19;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = 0.08;

  scene.add(new THREE.HemisphereLight(0xb8f7e5, 0x101923, 2.2));
  const key = new THREE.DirectionalLight(0xe1fff4, 3.3); key.position.set(5, 9, 5); key.castShadow = true; scene.add(key);
  const fill = new THREE.DirectionalLight(0x38bca2, 1.5); fill.position.set(-6, 3, -5); scene.add(fill);
  const rim = new THREE.PointLight(0x46e0c2, 35, 18); rim.position.set(1, 5, -5); scene.add(rim);
  const grid = new THREE.GridHelper(32, 64, 0x285049, 0x122a2b); grid.position.y = -1.25; scene.add(grid);

  const board = new THREE.Group(); scene.add(board);
  const staticParts = new THREE.Group(); board.add(staticParts);
  const interactive = [];
  const explodable = [];
  const leds = [];
  let active = false;
  let explosion = 0;
  let side = 'top';
  let probeVisible = true;
  let currentTrack = 'colibry';

  const mat = (color, roughness = 0.42, metalness = 0.15, options = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...options });
  const pcb = mat(C.pcb, 0.48, 0.34);
  const dark = mat(C.dark, 0.32, 0.24);
  const gold = mat(C.gold, 0.27, 0.8);
  const silk = mat(C.silk, 0.6, 0.05);

  function box(parent, name, size, position, material, pick = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name; mesh.userData.partName = name;
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    if (pick) interactive.push(mesh);
    return mesh;
  }

  function roundedBoard(name, parent = staticParts, color = pcb, width = 4.25, depth = 4.25) {
    const mesh = box(parent, name, [width, 0.15, depth], [0, 0, 0], color, true);
    mesh.userData.partName = name;
    // Mounting holes are represented by dark annuli at the four board corners.
    for (const [x, z] of [[-1.92, -1.92], [1.92, -1.92], [-1.92, 1.92], [1.92, 1.92]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.025, 8, 24), gold);
      ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.083, z); parent.add(ring);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.078, 20), mat(0x080f12, 0.8, 0.05));
      hole.rotation.x = -Math.PI / 2; hole.position.set(x, 0.084, z); parent.add(hole);
    }
    return mesh;
  }

  function textSprite(text, width = 256, height = 64, color = '#c8e1d5') {
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.font = '600 27px ui-monospace, Consolas, monospace';
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#5cf4bf'; ctx.shadowBlur = 5;
    ctx.fillText(text.toUpperCase().slice(0, 25), width / 2, height / 2);
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(width / 256 * 0.68, height / 64 * 0.17, 1);
    return sprite;
  }

  function addSilkscreen(text, x, z, color = '#9abeb0', parent = staticParts, rotation = 0) {
    const sprite = textSprite(text, 320, 52, color);
    sprite.position.set(x, 0.094, z); sprite.material.rotation = rotation;
    parent.add(sprite);
  }

  function addTrace(points, parent = staticParts, color = C.trace, radius = 0.018) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0.082, z)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 5), radius, 5, false), mat(color, 0.32, 0.72));
    parent.add(mesh);
    return mesh;
  }

  function addVia(x, z, parent = staticParts, radius = 0.035) {
    const via = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.018, 12), gold);
    via.position.set(x, 0.092, z); parent.add(via);
    const bore = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.36, radius * 0.36, 0.02, 10), dark);
    bore.position.set(x, 0.103, z); parent.add(bore);
  }

  function partGroup(name, x, z, sideName = 'top') {
    const group = new THREE.Group(); group.name = name; group.userData.partName = name;
    const y = sideName === 'top' ? 0.16 : -0.16;
    group.position.set(x, y, z); board.add(group);
    const distance = Math.hypot(x, z);
    group.userData.base = group.position.clone();
    group.userData.side = sideName;
    const radial = new THREE.Vector3(x || 0.1, 0, z || 0.1).normalize();
    group.userData.explode = new THREE.Vector3(radial.x * (0.17 + distance * 0.07), sideName === 'top' ? 0.54 + distance * 0.08 : -0.54 - distance * 0.08, radial.z * (0.17 + distance * 0.07));
    explodable.push(group);
    return group;
  }

  function component({ name, x, z, width = 0.52, depth = 0.42, height = 0.16, sideName = 'top', color = C.chip, pins = 4, label = name, interactivePart = true }) {
    const group = partGroup(name, x, z, sideName);
    const direction = sideName === 'top' ? 1 : -1;
    const bodyMat = typeof color === 'number' ? mat(color, 0.25, 0.36) : color;
    const bodyY = direction * (height / 2 + 0.01);
    box(group, `${name} package`, [width, height, depth], [0, bodyY, 0], bodyMat, interactivePart);
    box(group, `${name} die`, [width * 0.72, 0.025, depth * 0.68], [0, direction * (height + 0.025), 0], dark, false);
    const leadMat = mat(0x93a39c, 0.3, 0.77);
    const perSide = Math.max(2, Math.floor(pins / 4));
    for (let i = 0; i < perSide; i += 1) {
      const p = (i - (perSide - 1) / 2) * (width / Math.max(3, perSide));
      box(group, `${name} lead`, [0.035, 0.035, 0.07], [p, direction * 0.02, depth / 2 + 0.025], leadMat);
      box(group, `${name} lead`, [0.035, 0.035, 0.07], [p, direction * 0.02, -depth / 2 - 0.025], leadMat);
      const q = (i - (perSide - 1) / 2) * (depth / Math.max(3, perSide));
      box(group, `${name} lead`, [0.07, 0.035, 0.035], [width / 2 + 0.025, direction * 0.02, q], leadMat);
      box(group, `${name} lead`, [0.07, 0.035, 0.035], [-width / 2 - 0.025, direction * 0.02, q], leadMat);
    }
    const labelSprite = textSprite(label, 320, 52, '#b8f4d4');
    labelSprite.position.set(0, direction * (height + 0.055), 0);
    labelSprite.material.rotation = sideName === 'top' ? 0 : Math.PI;
    group.add(labelSprite);
    interactive.push(group);
    return group;
  }

  function connector({ name, x, z, rows = 1, columns = 8, pitch = 0.15, sideName = 'top', orientation = 'x', color = 0x121719 }) {
    const group = partGroup(name, x, z, sideName);
    const lengthX = orientation === 'x' ? columns * pitch : rows * pitch;
    const lengthZ = orientation === 'z' ? columns * pitch : rows * pitch;
    const height = 0.25;
    const direction = sideName === 'top' ? 1 : -1;
    box(group, `${name} housing`, [Math.max(0.2, lengthX + 0.12), height, Math.max(0.2, lengthZ + 0.12)], [0, direction * height / 2, 0], mat(color, 0.38, 0.17), true);
    for (let row = 0; row < rows; row += 1) for (let col = 0; col < columns; col += 1) {
      const xx = orientation === 'x' ? (col - (columns - 1) / 2) * pitch : (row - (rows - 1) / 2) * pitch;
      const zz = orientation === 'z' ? (col - (columns - 1) / 2) * pitch : (row - (rows - 1) / 2) * pitch;
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.23, 8), gold);
      pin.position.set(xx, direction * 0.19, zz); group.add(pin);
      const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 8), dark);
      socket.position.set(xx, direction * 0.14, zz); group.add(socket);
    }
    interactive.push(group);
    return group;
  }

  function addResistors(parent = staticParts, seed = 0) {
    const rng = (n) => { const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };
    const body = mat(0x28323a, 0.35, 0.33);
    for (let i = 0; i < 46; i += 1) {
      const x = -1.65 + rng(i + 1) * 3.3; const z = -1.65 + rng(i + 79) * 3.3;
      if (Math.hypot(x, z) < 0.78 || Math.abs(x) > 1.88 || Math.abs(z) > 1.88) continue;
      const group = partGroup(`SMD passive ${i + 1}`, x, z, 'top');
      const length = 0.1 + rng(i + 140) * 0.09;
      box(group, `SMD passive ${i + 1}`, [length, 0.055, 0.065], [0, 0.055, 0], body);
      box(group, `SMD termination ${i + 1}`, [0.022, 0.055, 0.067], [-length / 2, 0.055, 0], gold);
      box(group, `SMD termination ${i + 1}`, [0.022, 0.055, 0.067], [length / 2, 0.055, 0], gold);
      group.userData.explode.multiplyScalar(0.35);
    }
  }

  function addCameraModule() {
    const group = partGroup('QVA camera module / FPC flex', -2.75, 0.15, 'top');
    box(group, 'QVA image sensor module', [0.72, 0.12, 0.62], [0, 0.1, 0], mat(0x1b2b2e, 0.32, 0.25), true);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.21, 28), mat(0x283a43, 0.22, 0.52));
    barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.24, 0.04); group.add(barrel);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), mat(0x58adbd, 0.1, 0.62, { emissive: 0x102832 }));
    glass.position.set(0, 0.24, 0.151); group.add(glass);
    const fpc = box(group, 'Flexible camera cable', [1.1, 0.025, 0.22], [0.84, 0.06, 0], mat(0xa78e58, 0.55, 0.28));
    fpc.rotation.y = -0.1;
    for (let i = 0; i < 8; i += 1) box(group, 'FPC gold contact', [0.025, 0.01, 0.18], [0.38 + i * 0.11, 0.078, 0], gold);
    interactive.push(group);
    return group;
  }

  function addBattery() {
    const holder = partGroup('CR927 battery holder', -1.17, 0.7, 'top');
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.1, 48), mat(0x9d7951, 0.34, 0.64));
    disk.position.y = 0.07; holder.add(disk);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.04, 48), mat(0x4c4135, 0.45, 0.4));
    inner.position.y = 0.13; holder.add(inner);
    const contact = box(holder, 'Battery spring contact', [0.28, 0.045, 0.14], [0, 0.16, 0], gold);
    contact.rotation.y = 0.22;
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.12, 48), mat(0xbec4c1, 0.21, 0.8));
    coin.position.y = 0.45; coin.userData.partName = 'CR927 coin-cell battery'; holder.add(coin); interactive.push(coin);
    holder.userData.partName = 'CR927 battery holder'; interactive.push(holder);
    return holder;
  }

  function addAntenna() {
    const group = partGroup('2.4 GHz BLE antenna', 1.36, -1.56, 'bottom');
    box(group, 'Antenna ceramic substrate', [0.95, 0.08, 0.38], [0, -0.05, 0], mat(0xc6c5b5, 0.35, 0.25), true);
    for (let i = 0; i < 5; i += 1) box(group, 'Antenna metal element', [0.54 - i * 0.06, 0.018, 0.026], [0.08, -0.005, -0.13 + i * 0.065], gold);
    interactive.push(group);
  }

  function addProbe() {
    const probe = new THREE.Group(); probe.name = 'ColibryProbe'; probe.userData.partName = 'ColibryProbe programming and debug adapter';
    board.add(probe);
    const plate = box(probe, 'ColibryProbe PCB', [2.25, 0.14, 1.44], [3.35, -0.7, 0.05], mat(0x182a30, 0.48, 0.35), true);
    plate.userData.partName = 'ColibryProbe board';
    box(probe, 'USB connector shell', [0.45, 0.24, 0.52], [4.2, -0.58, 0.05], mat(0xb8c4c0, 0.27, 0.8), true);
    box(probe, 'SWD debug header', [0.34, 0.24, 0.94], [2.65, -0.53, 0.05], dark, true);
    for (let i = 0; i < 8; i += 1) box(probe, `SWD contact ${i + 1}`, [0.04, 0.22, 0.04], [2.65, -0.52, -0.35 + i * 0.115], gold);
    const buttonMat = mat(0x3a4548, 0.26, 0.42);
    box(probe, 'Probe reset button', [0.26, 0.12, 0.26], [3.45, -0.57, -0.35], buttonMat, true);
    box(probe, 'Probe power button', [0.26, 0.12, 0.26], [3.45, -0.57, 0.36], buttonMat, true);
    addSilkscreen('SWD · RESET · POWER', 3.33, 0.66, '#d2ddd5', probe);
    probe.userData.base = probe.position.clone();
    probe.userData.explode = new THREE.Vector3(1.0, -1.05, 0.15);
    explodable.push(probe); interactive.push(probe);
    const cableCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.4, 0.07, 1.0), new THREE.Vector3(2.65, 0.25, 1.6), new THREE.Vector3(3.2, 0.25, 1.8), new THREE.Vector3(3.48, -0.53, 0.75),
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 24, 0.045, 8, false), mat(0x36494a, 0.45, 0.22));
    cable.userData.partName = 'Probe connection cable'; board.add(cable); explodable.push(cable); cable.userData.base = cable.position.clone(); cable.userData.explode = new THREE.Vector3(0.5, -0.4, 0.25);
    return probe;
  }

  let probeGroup = null;
  let cameraModule = null;

  function buildColibry() {
    roundedBoard('Colibry EvalBoardTiny rev1 · PCB', staticParts, pcb, 4.25, 4.25);
    // Board edges, copper tracks, test pads and vias use the published exploded
    // top/bottom view to place the major subsystems. Fine layout is illustrative.
    const edge = box(staticParts, 'PCB edge mask', [4.18, 0.024, 4.18], [0, 0.079, 0], mat(C.mask, 0.58, 0.2));
    edge.material.transparent = true; edge.material.opacity = 0.22;
    addSilkscreen('ASYGN · COLIBRY', 0.12, 1.84);
    addSilkscreen('EVALBOARD TINY · REV 1', 0.1, 1.66, '#739e8d');
    addSilkscreen('TOP SIDE', -1.18, -1.82, '#648778');
    for (let i = 0; i < 9; i += 1) {
      const x = -1.28 + i * 0.32;
      addVia(x, -1.97); addVia(x, 1.97);
    }
    for (let i = 0; i < 5; i += 1) {
      const z = -1.1 + i * 0.48;
      addTrace([[-0.42, 0.1 + z * 0.16], [-0.95, z], [-1.5, z], [-1.8, z * 0.85]], staticParts, i % 2 ? 0x28795f : 0x327c81, 0.012);
      addTrace([[0.38, 0.2 + z * 0.12], [0.86, z], [1.32, z * 0.82], [1.78, z * 0.8]], staticParts, 0x24765f, 0.014);
    }
    for (const [x, z] of [[-1.2, -0.2], [0.9, 0.3], [1.55, 0.1], [-0.45, 1.32], [0.48, -1.35]]) addVia(x, z);
    addResistors(staticParts, 1);

    // Manufacturer's annotated top-side view identifies these physical regions.
    connector({ name: 'Camera connector · top side', x: 1.78, z: 0.02, rows: 2, columns: 8, pitch: 0.14, orientation: 'z' });
    component({ name: 'ColibryNPU chip', label: 'COLIBRY NPU', x: -0.28, z: 0.7, width: 0.92, depth: 0.84, height: 0.18, color: 0x202b2d, pins: 28 });
    component({ name: '3-axis accelerometer', label: 'ACCELEROMETER', x: 0.72, z: -0.1, width: 0.3, depth: 0.28, height: 0.1, color: 0x253238, pins: 8 });
    component({ name: 'Battery connector', label: 'BATTERY', x: -1.64, z: 1.64, width: 0.42, depth: 0.32, height: 0.19, color: 0xe2dfd3, pins: 2 });
    addBattery();
    component({ name: 'CPU / power-support IC', label: 'POWER / CPU', x: 0.86, z: 0.94, width: 0.38, depth: 0.34, height: 0.11, color: 0x202c30, pins: 16 });
    component({ name: 'External flash 8 Mbit', label: '8 Mbit FLASH', x: 0.45, z: 1.45, width: 0.28, depth: 0.2, height: 0.09, color: 0x20272b, pins: 8 });
    connector({ name: '2x GPIO / JTAG headers', x: 0.08, z: 1.98, rows: 1, columns: 8, pitch: 0.23, orientation: 'x' });
    cameraModule = addCameraModule();

    // Back-side devices are mounted beneath the same PCB and become visible by
    // flipping the model or opening the manufacturer's annotated reference.
    component({ name: 'Nordic nRF52832 BLE', label: 'nRF52832 · BLE', x: -0.22, z: -0.28, width: 0.62, depth: 0.54, height: 0.13, sideName: 'bottom', color: 0x202b31, pins: 32 });
    addAntenna();
    connector({ name: 'Image sensor FPC connector · bottom', x: -1.82, z: -0.45, rows: 1, columns: 8, pitch: 0.14, sideName: 'bottom', orientation: 'z' });
    connector({ name: 'ColibryProbe connector · bottom', x: 1.72, z: 0.52, rows: 2, columns: 6, pitch: 0.14, sideName: 'bottom', orientation: 'z' });
    component({ name: 'MEMS digital microphone', label: 'MEMS MIC', x: 1.58, z: 1.47, width: 0.35, depth: 0.3, height: 0.11, sideName: 'bottom', color: 0x263237, pins: 8 });
    addSilkscreen('BOTTOM · BLE / SENSOR / MIC', 0, -1.85, '#739e8d');
    probeGroup = addProbe();
    const ledMat = mat(C.mint, 0.2, 0.1, { emissive: C.mint, emissiveIntensity: 0.25 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), ledMat);
    led.position.set(1.48, 0.22, 1.45); led.userData.partName = 'Status LED'; board.add(led); leds.push(led);
  }

  function buildAlif() {
    roundedBoard('Alif Ensemble E7 development kit · illustrative carrier', staticParts, pcb, 5.0, 3.8);
    component({ name: 'Alif Ensemble E7 SoC', label: 'ENSEMBLE E7 · M55', x: 0, z: 0, width: 1.0, depth: 0.85, height: 0.18, color: 0x202d31, pins: 48 });
    component({ name: 'Ethos-U55 NPU subsystem', label: 'ETHOS-U55', x: 1.18, z: 0, width: 0.68, depth: 0.58, height: 0.15, color: 0x26342c, pins: 32 });
    component({ name: 'RGB camera input', label: 'RGB CAMERA', x: -1.7, z: -1.35, width: 0.64, depth: 0.32, height: 0.2 });
    component({ name: 'LCD display connector', label: 'LCD / DISPLAY', x: -1.65, z: 1.35, width: 0.85, depth: 0.3, height: 0.18 });
    component({ name: 'LPDDR memory', label: 'LPDDR', x: 1.1, z: 0.95, width: 0.48, depth: 0.38, height: 0.1 });
    connector({ name: 'JTAG / USB debug', x: 2.3, z: 0.4, rows: 2, columns: 8, orientation: 'z' });
  }

  function buildSpace() {
    roundedBoard('Aidge in Space · CPU / FPGA carrier concept', staticParts, pcb, 5.3, 3.8);
    component({ name: 'Alif Ensemble E7 SoC', label: 'ALIF E7 · CPU', x: -0.9, z: 0, width: 0.95, depth: 0.8, height: 0.18, color: 0x202d31, pins: 48 });
    component({ name: 'External FPGA module', label: 'FPGA IMAGE PIPELINE', x: 1.0, z: 0, width: 1.0, depth: 0.84, height: 0.18, color: 0x453323, pins: 48 });
    component({ name: 'Camera input', label: 'CAMERA INPUT', x: -2.25, z: -1.15, width: 0.52, depth: 0.36, height: 0.18 });
    component({ name: 'Flash / SD storage', label: 'STORAGE', x: 2.12, z: 1.15, width: 0.58, depth: 0.38, height: 0.13 });
    connector({ name: 'JTAG / UART', x: 2.42, z: -0.45, rows: 2, columns: 8, orientation: 'z' });
  }

  function setTrack(track) {
    for (const child of [...board.children]) {
      child.traverse((part) => {
        part.geometry?.dispose?.();
        if (Array.isArray(part.material)) part.material.forEach((m) => m.dispose?.());
        else part.material?.dispose?.();
        if (part.material?.map) part.material.map.dispose?.();
      });
      board.remove(child);
    }
    staticParts.clear(); interactive.length = 0; explodable.length = 0; leds.length = 0;
    currentTrack = track; explosion = 0;
    if (track === 'alif') buildAlif();
    else if (track === 'space') buildSpace();
    else buildColibry();
    setProbeVisible(probeVisible);
    applyExplosion();
    board.rotation.set(side === 'bottom' ? Math.PI : 0, 0, 0);
    camera.position.set(6.3, 5.8, 7.4); controls.target.set(0, 0.2, 0); controls.update();
  }

  function applyExplosion() {
    for (const part of explodable) {
      const base = part.userData.base || new THREE.Vector3();
      const offset = part.userData.explode || new THREE.Vector3();
      part.position.copy(base).addScaledVector(offset, explosion);
    }
  }

  function setExplode(value) { explosion = THREE.MathUtils.clamp(Number(value) || 0, 0, 1); applyExplosion(); }
  function setSide(value) {
    side = value;
    if (currentTrack === 'colibry') board.rotation.x = side === 'bottom' ? Math.PI : 0;
    else board.rotation.x = 0;
    controls.target.set(0, 0.2, 0); controls.update();
  }
  function setProbeVisible(value) {
    probeVisible = Boolean(value);
    if (probeGroup) probeGroup.visible = probeVisible;
  }

  function resetView() {
    camera.position.set(6.3, 5.8, 7.4);
    controls.target.set(0, 0.2, 0);
    controls.reset();
    controls.update();
  }

  const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactive, true)[0];
    if (hit) onComponent?.(hit.object.userData.partName || hit.object.parent?.userData.partName || hit.object.name || 'Board component');
  });

  function resize() {
    const width = Math.max(1, canvas.clientWidth || 800); const height = Math.max(1, canvas.clientHeight || 500);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  let tick = 0;
  function animate() {
    tick += 1; controls.update();
    board.rotation.y = Math.sin(tick * 0.002) * 0.025;
    for (const led of leds) {
      led.material.emissiveIntensity = active ? 1 + Math.abs(Math.sin(tick * 0.13)) * 3 : 0.2;
      led.scale.setScalar(active ? 1 + Math.sin(tick * 0.16) * 0.13 : 1);
    }
    renderer.render(scene, camera); requestAnimationFrame(animate);
  }
  setTrack('colibry'); animate();
  return { setTrack, setActivity(value) { active = Boolean(value); }, setExplode, setSide, setProbeVisible, resetView, dispose() { observer.disconnect(); controls.dispose(); renderer.dispose(); } };
}
