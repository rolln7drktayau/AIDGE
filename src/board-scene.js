import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLORS = { pcb: 0x164d47, solder: 0x92a29a, copper: 0xc78a45, dark: 0x10181a, chip: 0x182123, gold: 0xd1ae67, led: 0x55f2ae };

export function createBoardScene(canvas, onComponent) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0c1316');
  scene.fog = new THREE.Fog('#0c1316', 9, 24);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(7.2, 6.3, 8.8);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    return { setTrack() {}, setActivity() {}, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0.2, 0);
  controls.minDistance = 5;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI * 0.47;

  scene.add(new THREE.HemisphereLight(0xb8eee2, 0x172024, 2.0));
  const key = new THREE.DirectionalLight(0xe3fff7, 3.2);
  key.position.set(4, 8, 5);
  scene.add(key);
  const rim = new THREE.PointLight(0x55b5a0, 45, 14);
  rim.position.set(-5, 3, -4);
  scene.add(rim);
  const grid = new THREE.GridHelper(30, 40, 0x28413d, 0x172522);
  grid.position.y = -0.62;
  scene.add(grid);

  const board = new THREE.Group();
  scene.add(board);
  const interactive = [];
  const leds = [];

  function material(color, roughness = 0.5, metalness = 0.1) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }
  const pcbMat = material(COLORS.pcb, 0.68, 0.08);
  const darkMat = material(COLORS.dark, 0.38, 0.2);
  const chipMat = material(COLORS.chip, 0.25, 0.25);
  const goldMat = material(COLORS.gold, 0.3, 0.76);

  function box(parent, name, size, pos, mat, interactivePart = false, radius = 0) {
    let geometry = new THREE.BoxGeometry(...size);
    if (radius > 0) {
      // Board details remain simple boxes for stable performance across browsers.
      geometry = new THREE.BoxGeometry(...size);
    }
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.partName = name;
    parent.add(mesh);
    if (interactivePart) interactive.push(mesh);
    return mesh;
  }

  function addTextPlate(name, x, z, width = 1.45) {
    const plate = box(board, `${name} label`, [width, 0.025, 0.24], [x, 0.235, z], darkMat);
    plate.userData.partName = name;
  }

  function addHeader(name, x, z, count, axis = 'x') {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    board.add(group);
    box(group, name, axis === 'x' ? [count * 0.23 + 0.13, 0.32, 0.32] : [0.32, 0.32, count * 0.23 + 0.13], [0, 0.29, 0], darkMat, true);
    const pinMat = material(COLORS.gold, 0.26, 0.82);
    for (let i = 0; i < count; i += 1) {
      const offset = (i - (count - 1) / 2) * 0.23;
      box(group, `${name} pin ${i + 1}`, [0.035, 0.29, 0.035], axis === 'x' ? [offset, 0.27, 0] : [0, 0.27, offset], pinMat);
    }
  }

  function addChip({ name, x, z, sx, sz, color = chipMat, title = name }) {
    box(board, `${name} package`, [sx, 0.15, sz], [x, 0.31, z], color, true);
    box(board, `${name} top`, [sx * 0.83, 0.025, sz * 0.83], [x, 0.4, z], darkMat);
    addTextPlate(title, x, z + sz / 2 + 0.2, Math.max(0.8, sx + 0.15));
  }

  function buildColibry() {
    box(board, 'ColibryNPU EvalBoardTiny PCB', [7.2, 0.28, 4.6], [0, 0, 0], pcbMat, true);
    const screwMat = material(0x84928c, 0.32, 0.7);
    for (const [x, z] of [[-3.2, -1.9], [3.2, -1.9], [-3.2, 1.9], [3.2, 1.9]]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 20), screwMat);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(x, 0.16, z);
      board.add(screw);
    }
    addChip({ name: 'ColibryNPU / NNPA', title: 'COLIBRY NPU · NNPA', x: -0.3, z: -0.2, sx: 1.55, sz: 1.5, color: material(0x173137, 0.2, 0.33) });
    addChip({ name: 'RISC-V MCU', title: '32-BIT RISC-V MCU', x: 1.9, z: -0.55, sx: 1.02, sz: 0.8 });
    addChip({ name: 'Nordic nRF52832 BLE', title: 'nRF52832 · BLE', x: 2.15, z: 0.72, sx: 0.8, sz: 0.64, color: material(0x193c42, 0.28, 0.25) });
    addChip({ name: 'External flash 8 Mbit', title: '8 Mbit FLASH', x: 0.8, z: -1.48, sx: 0.66, sz: 0.46 });

    // Camera flex connector and sensor block on the upper edge.
    box(board, 'Camera FPC connector', [1.25, 0.25, 0.42], [-2.35, 0.27, -1.88], darkMat, true);
    for (let pin = 0; pin < 10; pin += 1) box(board, `FPC contact ${pin + 1}`, [0.07, 0.025, 0.28], [-2.85 + pin * 0.11, 0.41, -1.88], goldMat);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.34, 0.28, 32), material(0x334c55, 0.2, 0.52));
    lens.rotation.x = Math.PI / 2;
    lens.position.set(-2.35, 0.43, -1.12);
    lens.userData.partName = 'QVA low-power image sensor / lens';
    board.add(lens);
    interactive.push(lens);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), material(0x56a2b5, 0.14, 0.7));
    glass.position.set(-2.35, 0.43, -0.96);
    board.add(glass);
    addTextPlate('QVA IMAGE SENSOR', -2.35, -0.52, 1.75);

    addChip({ name: 'Digital microphone', title: 'DIGITAL MIC', x: -2.35, z: 0.55, sx: 0.48, sz: 0.48, color: material(0x283d36, 0.55, 0.12) });
    addChip({ name: '3-axis accelerometer', title: '3-AXIS IMU', x: -1.35, z: 1.2, sx: 0.5, sz: 0.43, color: material(0x283d36, 0.55, 0.12) });
    addHeader('2x GPIO · 2x JTAG', -3.05, -0.15, 8, 'z');
    addHeader('4x SPI slave', 0.15, 1.78, 8, 'x');
    addHeader('I2C', 1.5, 1.78, 4, 'x');
    addHeader('External debug probe', 3.05, 1.13, 6, 'z');
    addChip({ name: 'CR927 battery holder', title: 'CR927 BATTERY', x: 2.52, z: -1.48, sx: 1.1, sz: 0.62, color: material(0x37403f, 0.42, 0.42) });
    const battery = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.65, 32), material(0xb7bbc0, 0.22, 0.72));
    battery.rotation.z = Math.PI / 2;
    battery.position.set(2.52, 0.77, -1.48);
    battery.userData.partName = 'CR927 coin-cell battery';
    board.add(battery);
    interactive.push(battery);
    const ledMat = new THREE.MeshStandardMaterial({ color: COLORS.led, emissive: COLORS.led, emissiveIntensity: 0.2 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), ledMat);
    led.position.set(3.0, 0.48, -0.65);
    led.userData.partName = 'Status LED';
    board.add(led);
    leds.push(led);
    addTextPlate('USB / PROGRAMMING EDGE', 0, -2.1, 2.2);
  }

  function buildAlif() {
    box(board, 'Alif Ensemble E7 DevKit', [7.2, 0.3, 4.7], [0, 0, 0], pcbMat, true);
    addChip({ name: 'Alif Ensemble E7 SoC', title: 'ENSEMBLE E7 · M55 + ETHOS-U', x: 0, z: 0, sx: 1.7, sz: 1.5, color: material(0x18333a, 0.2, 0.35) });
    addChip({ name: 'LPDDR memory', title: 'LPDDR MEMORY', x: 1.65, z: -0.15, sx: 0.95, sz: 0.85 });
    addChip({ name: 'Camera interface', title: 'RGB CAMERA / MIPI', x: -2.45, z: -1.45, sx: 1.1, sz: 0.62 });
    addChip({ name: 'LCD display connector', title: 'LCD DISPLAY', x: -2.45, z: 1.2, sx: 1.4, sz: 0.55 });
    addChip({ name: 'USB programming interface', title: 'USB · DEBUG · JLINK', x: 2.55, z: 1.35, sx: 1.45, sz: 0.6 });
    addHeader('Expansion GPIO', 0.1, -1.95, 14, 'x');
    addHeader('UART / debug', 3.1, -0.3, 8, 'z');
    const screen = box(board, 'LCD preview panel', [1.3, 0.06, 0.85], [-2.45, 0.54, 1.2], material(0x0d2533, 0.2, 0.2), true);
    screen.material.emissive = new THREE.Color(0x09212b);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), material(COLORS.led, 0.25, 0.1));
    led.position.set(3.0, 0.4, -1.5);
    board.add(led);
    leds.push(led);
  }

  function buildSpace() {
    box(board, 'Space edge-compute development carrier', [7.2, 0.3, 4.7], [0, 0, 0], pcbMat, true);
    addChip({ name: 'Alif Ensemble E7 SoC', title: 'ALIF E7 · CPU + ETHOS-U', x: -1.1, z: -0.15, sx: 1.55, sz: 1.38, color: material(0x18333a, 0.2, 0.35) });
    addChip({ name: 'External FPGA module', title: 'FPGA / IMAGE PIPELINE', x: 1.5, z: -0.15, sx: 1.45, sz: 1.2, color: material(0x3c3021, 0.27, 0.3) });
    addChip({ name: 'Camera input', title: 'CAMERA INPUT', x: -2.65, z: -1.35, sx: 0.85, sz: 0.55 });
    addChip({ name: 'Storage', title: 'FLASH / SD STORAGE', x: 2.6, z: 1.35, sx: 0.9, sz: 0.65 });
    addChip({ name: 'Power monitor', title: 'POWER MONITOR', x: 2.6, z: -1.35, sx: 0.7, sz: 0.55, color: material(0x344039, 0.44, 0.16) });
    addHeader('Sensor / camera I/O', -0.1, -1.95, 12, 'x');
    addHeader('JTAG / UART', 3.1, -0.2, 8, 'z');
    addHeader('USB / power', -3.1, 0.1, 8, 'z');
  }

  function setTrack(track) {
    while (board.children.length) {
      const child = board.children[0];
      child.traverse((part) => {
        part.geometry?.dispose?.();
        if (Array.isArray(part.material)) part.material.forEach((entry) => entry.dispose?.());
        else part.material?.dispose?.();
      });
      board.remove(child);
    }
    interactive.length = 0;
    leds.length = 0;
    if (track === 'alif') buildAlif();
    else if (track === 'space') buildSpace();
    else buildColibry();
    camera.position.set(7.2, 6.3, 8.8);
    controls.target.set(0, 0.2, 0);
    controls.update();
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener('pointerdown', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactive, false)[0];
    if (hit) onComponent?.(hit.object.userData.partName || 'Board component');
  });

  let active = false;
  let frame = 0;
  function setActivity(value) { active = value; }
  function resize() {
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 500;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  setTrack('colibry');

  function animate() {
    frame += 1;
    controls.update();
    board.rotation.y = Math.sin(frame * 0.002) * 0.035;
    leds.forEach((led, index) => {
      const intensity = active ? 1.2 + Math.abs(Math.sin(frame * (0.12 + index * 0.03))) * 2.8 : 0.2;
      led.material.emissiveIntensity = intensity;
      const scale = active ? 1 + Math.sin(frame * 0.15) * 0.16 : 1;
      led.scale.setScalar(scale);
    });
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
  return { setTrack, setActivity, dispose() { observer.disconnect(); controls.dispose(); renderer.dispose(); } };
}
