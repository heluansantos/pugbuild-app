import type { EventSubscription } from "expo";

/** One tag heard during a ranging cycle. UUID is lowercase on both platforms. */
export interface SeenBeacon {
  uuid: string;
  major: number;
  minor: number;
  /** Signal strength in dBm (negative; closer to 0 is nearer). */
  rssi: number;
}

export interface BeaconScannerEvents {
  onBeacons: (event: { beacons: SeenBeacon[] }) => void;
}

export interface BeaconScannerNative {
  /** False on the iOS Simulator, on devices without Bluetooth LE and when Bluetooth is off (Android). */
  isAvailable(): boolean;
  /** Ranges the given iBeacon UUIDs (lowercase or uppercase) until stopRanging. */
  startRanging(uuids: string[]): Promise<void>;
  stopRanging(): Promise<void>;
  addListener<K extends keyof BeaconScannerEvents>(event: K, listener: BeaconScannerEvents[K]): EventSubscription;
}
