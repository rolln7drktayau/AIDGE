import test from 'node:test';
import assert from 'node:assert/strict';
import { estimatePipeline, getGoalStatus, parseTelemetryLine } from '../src/simulation.js';

test('default pipeline produces bounded, internally consistent estimates', () => {
  const result = estimatePipeline();
  assert.ok(result.pipelineMs > result.inferenceMs);
  assert.ok(Math.abs(result.fps - 1000 / result.pipelineMs) < 1e-9);
  assert.ok(result.powerMw > 0);
  assert.ok(result.detectionScore <= 1 && result.detectionScore > 0);
  assert.equal(result.isEstimate, true);
});

test('larger image resolution increases latency, memory and power', () => {
  const small = estimatePipeline({ width: 160, height: 120 });
  const large = estimatePipeline({ width: 320, height: 240 });
  assert.ok(large.pipelineMs > small.pipelineMs);
  assert.ok(large.peakMemoryKB > small.peakMemoryKB);
  assert.ok(large.powerMw > small.powerMw);
});

test('memory gate catches model and input overflow', () => {
  assert.equal(estimatePipeline({ width: 320, height: 240, modelKB: 620 }).memoryPass, false);
  assert.equal(estimatePipeline({ width: 160, height: 120, modelKB: 360 }).memoryPass, true);
});

test('goal status exposes all four challenge gates', () => {
  const rows = getGoalStatus(estimatePipeline());
  assert.deepEqual(rows.map((row) => row.key), ['accuracy', 'fps', 'power', 'memory']);
  assert.ok(rows.every((row) => typeof row.pass === 'boolean'));
});

test('hardware telemetry parser accepts JSON samples and rejects log noise', () => {
  const sample = parseTelemetryLine('{"fps":12.5,"power_mw":4.2,"latency_ms":55,"accuracy":0.96,"memory_kb":410,"count":3}');
  assert.equal(sample.fps, 12.5);
  assert.equal(sample.isEstimate, false);
  assert.equal(parseTelemetryLine('boot: camera ready'), null);
  assert.equal(parseTelemetryLine('{"fps":null}'), null);
  assert.equal(parseTelemetryLine('{bad json'), null);
});
