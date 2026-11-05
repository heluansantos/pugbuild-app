import CoreLocation
import ExpoModulesCore

/**
 * iBeacon ranging through CoreLocation (layer 2 of the fleet plan, docs/FLEET.md in pugbuild-web).
 * CoreBluetooth never exposes iBeacon advertisements on iOS, so ranging is the only way to read a
 * tag's UUID/major/minor. It rides on the location permission the app already asks for (when in
 * use) and only runs while JS keeps it started, i.e. while the clock screen is open.
 */
public class BeaconScannerModule: Module {
  private lazy var ranger = BeaconRanger { [weak self] beacons in
    self?.sendEvent("onBeacons", ["beacons": beacons])
  }

  public func definition() -> ModuleDefinition {
    Name("BeaconScanner")

    Events("onBeacons")

    // False on the Simulator and on devices without Bluetooth LE.
    Function("isAvailable") { () -> Bool in
      CLLocationManager.isRangingAvailable()
    }

    AsyncFunction("startRanging") { (uuids: [String]) in
      self.ranger.start(uuids: uuids)
    }.runOnQueue(.main)

    AsyncFunction("stopRanging") {
      self.ranger.stop()
    }.runOnQueue(.main)

    OnDestroy {
      self.ranger.stop()
    }
  }
}

final class BeaconRanger: NSObject, CLLocationManagerDelegate {
  private let manager = CLLocationManager()
  private var constraints: [CLBeaconIdentityConstraint] = []
  private let onBeacons: ([[String: Any]]) -> Void

  init(onBeacons: @escaping ([[String: Any]]) -> Void) {
    self.onBeacons = onBeacons
    super.init()
    manager.delegate = self
  }

  func start(uuids: [String]) {
    stop()
    guard CLLocationManager.isRangingAvailable() else { return }
    constraints = uuids.compactMap { UUID(uuidString: $0) }.map { CLBeaconIdentityConstraint(uuid: $0) }
    for constraint in constraints {
      manager.startRangingBeacons(satisfying: constraint)
    }
  }

  func stop() {
    for constraint in constraints {
      manager.stopRangingBeacons(satisfying: constraint)
    }
    constraints = []
  }

  func locationManager(_ manager: CLLocationManager, didRange beacons: [CLBeacon], satisfying constraint: CLBeaconIdentityConstraint) {
    // Beacons with an unknown proximity were not actually heard in this cycle.
    let seen: [[String: Any]] = beacons
      .filter { $0.proximity != .unknown }
      .map {
        [
          "uuid": $0.uuid.uuidString.lowercased(),
          "major": $0.major.intValue,
          "minor": $0.minor.intValue,
          "rssi": $0.rssi,
        ]
      }
    if !seen.isEmpty {
      onBeacons(seen)
    }
  }

  func locationManager(_ manager: CLLocationManager, didFailRangingFor constraint: CLBeaconIdentityConstraint, error: Error) {
    // Bluetooth off or ranging denied: nothing to report; JS keeps working without sightings.
  }
}
