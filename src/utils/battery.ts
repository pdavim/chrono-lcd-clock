export interface WebBatteryManager {
  readonly charging: boolean;
  readonly chargingTime: number;
  readonly dischargingTime: number;
  readonly level: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

export interface NavigatorWithBattery {
  getBattery?: () => Promise<WebBatteryManager>;
}

export interface BatteryStatusSnapshot {
  supported: boolean;
  levelPercent: number;
  charging: boolean;
  isLow: boolean;
  bars: 0 | 1 | 2 | 3 | 4;
  ariaLabel: string;
}

export const UNSUPPORTED_BATTERY_STATUS: BatteryStatusSnapshot = {
  supported: false,
  levelPercent: 0,
  charging: false,
  isLow: false,
  bars: 0,
  ariaLabel: 'Battery status unavailable',
};

export function computeBatteryBars(levelPercent: number): 0 | 1 | 2 | 3 | 4 {
  if (levelPercent <= 10) return 0;
  if (levelPercent <= 35) return 1;
  if (levelPercent <= 60) return 2;
  if (levelPercent <= 85) return 3;
  return 4;
}

export function normalizeBatteryReading(raw: {
  level: number;
  charging: boolean;
}): BatteryStatusSnapshot {
  const safeLevel = Number.isFinite(raw.level)
    ? Math.min(1, Math.max(0, raw.level))
    : 0;
  const levelPercent = Math.round(safeLevel * 100);
  const charging = Boolean(raw.charging);
  const isLow = !charging && levelPercent <= 20;
  const bars = computeBatteryBars(levelPercent);

  let ariaLabel = `Battery ${levelPercent}%`;
  if (charging) {
    ariaLabel = `Battery ${levelPercent}%, charging`;
  } else if (isLow) {
    ariaLabel = `Battery ${levelPercent}%, low battery`;
  }

  return {
    supported: true,
    levelPercent,
    charging,
    isLow,
    bars,
    ariaLabel,
  };
}

export function subscribeToBatteryStatus(
  nav: NavigatorWithBattery | undefined,
  onUpdate: (snapshot: BatteryStatusSnapshot) => void
): () => void {
  if (!nav || typeof nav.getBattery !== 'function') {
    onUpdate(UNSUPPORTED_BATTERY_STATUS);
    return () => {};
  }

  let disposed = false;
  let activeManager: WebBatteryManager | null = null;

  const handleBatteryChange = () => {
    if (disposed || !activeManager) return;
    onUpdate(
      normalizeBatteryReading({
        level: activeManager.level,
        charging: activeManager.charging,
      })
    );
  };

  nav
    .getBattery()
    .then((manager) => {
      if (disposed || !manager) return;
      activeManager = manager;
      handleBatteryChange();
      manager.addEventListener('levelchange', handleBatteryChange);
      manager.addEventListener('chargingchange', handleBatteryChange);
    })
    .catch(() => {
      if (!disposed) {
        onUpdate(UNSUPPORTED_BATTERY_STATUS);
      }
    });

  return () => {
    disposed = true;
    if (activeManager) {
      activeManager.removeEventListener('levelchange', handleBatteryChange);
      activeManager.removeEventListener('chargingchange', handleBatteryChange);
      activeManager = null;
    }
  };
}

export function shouldRenderBatteryIndicator(params: {
  batterySupported: boolean;
  showBatteryLevel: boolean;
}): boolean {
  return params.batterySupported && params.showBatteryLevel;
}
