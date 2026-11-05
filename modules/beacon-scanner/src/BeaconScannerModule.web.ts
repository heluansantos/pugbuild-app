import type { BeaconScannerNative } from "./BeaconScanner.types";

/** No Bluetooth ranging on the web: the clock screen simply never reports sightings. */
const BeaconScannerWeb: BeaconScannerNative = {
  isAvailable: () => false,
  startRanging: async () => undefined,
  stopRanging: async () => undefined,
  addListener: () => ({ remove: () => undefined }),
};

export default BeaconScannerWeb;
