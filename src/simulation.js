export const LIMITS = Object.freeze({
  npuMemoryKB: 640,
  targetPowerMw: 5,
  fpsBronze: 1,
  fpsSilver: 5,
  fpsGold: 10,
  fpsLegendary: 15,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Deterministic planning estimate only. These values are not board measurements. */
export function estimatePipeline(config = {}) {
  const width = clamp(Number(config.width ?? 160), 80, 320);
  const height = clamp(Number(config.height ?? 120), 60, 240);
  const modelKB = clamp(Number(config.modelKB ?? 360), 32, 620);
  const confidence = clamp(Number(config.confidence ?? 0.58), 0.1, 0.95);
  const sceneLoad = clamp(Number(config.sceneLoad ?? 0.35), 0, 1);
  const frameBytesKB = (width * height) / 1024;
  const peakMemoryKB = modelKB + frameBytesKB * 1.22 + 38;
  const workScale = (width * height) / (160 * 120);
  const modelScale = modelKB / 360;
  const inferenceMs = 24 * workScale * (0.48 + modelScale * 0.52);
  const acquisitionMs = 8 + workScale * 3.5;
  const postprocessMs = 4 + sceneLoad * 8 + (confidence < 0.4 ? 2 : 0);
  const pipelineMs = acquisitionMs + inferenceMs + postprocessMs;
  const fps = 1000 / pipelineMs;
  const powerMw = 1.15 + 0.56 * workScale * modelScale + sceneLoad * 0.32;
  const detectionScore = clamp(0.985 - Math.abs(0.58 - confidence) * 0.11 - sceneLoad * 0.045, 0.72, 0.995);
  const energyPerFrameMj = powerMw / fps;
  const memoryPass = peakMemoryKB <= LIMITS.npuMemoryKB;
  const scoreBand = detectionScore > 0.98 ? 'LEGENDARY' : detectionScore > 0.95 ? 'GOLD' : detectionScore > 0.9 ? 'SILVER' : detectionScore > 0.8 ? 'BRONZE' : 'BELOW BRONZE';
  const fpsBand = fps > 15 ? 'LEGENDARY' : fps > 10 ? 'GOLD' : fps > 5 ? 'SILVER' : fps > 1 ? 'BRONZE' : 'BELOW BRONZE';
  const powerBand = powerMw < 2 ? 'LEGENDARY' : powerMw < LIMITS.targetPowerMw ? 'GOLD' : powerMw < 10 ? 'SILVER' : powerMw < 15 ? 'BRONZE' : 'ABOVE BRONZE';

  return {
    width, height, modelKB,
    acquisitionMs, inferenceMs, postprocessMs, pipelineMs, fps, powerMw,
    detectionScore, peakMemoryKB, energyPerFrameMj,
    memoryPass,
    scoreBand, fpsBand, powerBand,
    targetPass: memoryPass && fps > LIMITS.fpsGold && powerMw < LIMITS.targetPowerMw && detectionScore > 0.95,
    isEstimate: true,
  };
}

export function parseTelemetryLine(line) {
  if (!line || typeof line !== 'string') return null;
  try {
    const data = JSON.parse(line.trim());
    const limits = { fps: [0, 100000], power_mw: [0, 100000], latency_ms: [0, 1e9], accuracy: [0, 1], memory_kb: [0, 1e9], count: [0, Number.MAX_SAFE_INTEGER] };
    const present = Object.keys(limits).filter((key) => Object.hasOwn(data, key));
    if (!present.length) return null;
    for (const key of present) {
      const value = data[key];
      const [min, max] = limits[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return null;
      if (key === 'count' && !Number.isInteger(value)) return null;
    }
    return {
      fps: finite(data.fps),
      powerMw: finite(data.power_mw),
      latencyMs: finite(data.latency_ms),
      accuracy: finite(data.accuracy),
      memoryKB: finite(data.memory_kb),
      count: finite(data.count),
      source: data.source || 'hardware',
      timestamp: data.timestamp || new Date().toISOString(),
      isEstimate: false,
    };
  } catch {
    return null;
  }
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getGoalStatus(metrics) {
  return [
    { key: 'accuracy', label: 'Detection score > 95%', pass: metrics.detectionScore > 0.95, value: `${(metrics.detectionScore * 100).toFixed(1)}%` },
    { key: 'fps', label: 'Frame rate > 10 FPS', pass: metrics.fps > 10, value: `${metrics.fps.toFixed(1)} FPS` },
    { key: 'power', label: 'Power < 5 mW', pass: metrics.powerMw < 5, value: `${metrics.powerMw.toFixed(2)} mW` },
    { key: 'memory', label: 'Model + input < 640 kB', pass: metrics.memoryPass, value: `${metrics.peakMemoryKB.toFixed(0)} / 640 kB` },
  ];
}
