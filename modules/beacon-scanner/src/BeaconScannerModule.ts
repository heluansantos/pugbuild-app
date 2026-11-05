import { requireNativeModule } from "expo";
import type { BeaconScannerNative } from "./BeaconScanner.types";

export default requireNativeModule<BeaconScannerNative>("BeaconScanner");
