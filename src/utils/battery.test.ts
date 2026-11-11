import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BatteryStatusSnapshot,
  UNSUPPORTED_BATTERY_STATUS,
  WebBatteryManager,
  computeBatteryBars,
  normalizeBatteryReading,
  shouldRenderBatteryIndicator,
  subscribeToBatteryStatus,
} from './battery';
import { DEFAULT_SETTINGS } from './time';

test('normalizeBatteryReading clamps charge level, calculates LCD bars, and formats labels', () => {
  assert.equal(computeBatteryBars(5), 0);
  assert.equal(computeBatteryBars(25), 1);
  assert.equal(computeBatteryBars(50), 2);
  assert.equal(computeBatteryBars(80), 3);
  assert.equal(computeBatteryBars(95), 4);

  assert.deepEqual(normalizeBatteryReading({ level: 0.84, charging: true }), {
    supported: true,
    levelPercent: 84,
    charging: true,
    isLow: false,
    bars: 3,
    ariaLabel: 'Battery 84%, charging',
  });

  assert.deepEqual(normalizeBatteryReading({ level: 0.15, charging: false }), {
    supported: true,
    levelPercent: 15,
    charging: false,
    isLow: true,
    bars: 1,
    ariaLabel: 'Battery 15%, low battery',
  });

  // Clamps out-of-range values safely
  assert.equal(normalizeBatteryReading({ level: 1.4, charging: false }).levelPercent, 100);
  assert.equal(normalizeBatteryReading({ level: -0.2, charging: false }).levelPercent, 0);
});

test('subscribeToBatteryStatus handles unsupported browsers, real-time events, and cleanup', async () => {
  const unsupportedUpdates: BatteryStatusSnapshot[] = [];
  const cleanupUnsupported = subscribeToBatteryStatus({}, (snap) => {
    unsupportedUpdates.push(snap);
  });
  assert.deepEqual(unsupportedUpdates, [UNSUPPORTED_BATTERY_STATUS]);
  cleanupUnsupported();

  const listeners = new Map<string, Set<() => void>>();
  const mockBattery: {
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    addEventListener: WebBatteryManager['addEventListener'];
    removeEventListener: WebBatteryManager['removeEventListener'];
    emit: (type: string) => void;
  } = {
    level: 0.72,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 3600,
    addEventListener(type, cb) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(cb);
    },
    removeEventListener(type, cb) {
      listeners.get(type)?.delete(cb);
    },
    emit(type) {
      listeners.get(type)?.forEach((cb) => cb());
    },
  };

  const snapshots: BatteryStatusSnapshot[] = [];
  const unsubscribe = subscribeToBatteryStatus(
    { getBattery: async () => mockBattery },
    (snap) => snapshots.push(snap)
  );

  // Flush microtask for getBattery() resolution
  await Promise.resolve();
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].levelPercent, 72);
  assert.equal(snapshots[0].charging, false);

  // Real-time chargingchange event
  mockBattery.charging = true;
  mockBattery.emit('chargingchange');
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[1].charging, true);
  assert.equal(snapshots[1].ariaLabel, 'Battery 72%, charging');

  // Real-time levelchange event
  mockBattery.charging = false;
  mockBattery.level = 0.18;
  mockBattery.emit('levelchange');
  assert.equal(snapshots.length, 3);
  assert.equal(snapshots[2].levelPercent, 18);
  assert.equal(snapshots[2].isLow, true);

  // Unsubscribe detaches listeners so subsequent events are ignored
  unsubscribe();
  mockBattery.level = 0.99;
  mockBattery.emit('levelchange');
  assert.equal(snapshots.length, 3);
});

test('shouldRenderBatteryIndicator respects both Web Battery support and Display toggle', () => {
  assert.equal(DEFAULT_SETTINGS.showBatteryLevel, true);
  assert.equal(
    shouldRenderBatteryIndicator({ batterySupported: true, showBatteryLevel: true }),
    true
  );
  assert.equal(
    shouldRenderBatteryIndicator({ batterySupported: true, showBatteryLevel: false }),
    false
  );
  assert.equal(
    shouldRenderBatteryIndicator({ batterySupported: false, showBatteryLevel: true }),
    false
  );
});
