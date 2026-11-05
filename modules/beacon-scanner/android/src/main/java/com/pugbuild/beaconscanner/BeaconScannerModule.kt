package com.pugbuild.beaconscanner

import android.bluetooth.BluetoothManager
import android.bluetooth.le.BluetoothLeScanner
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.os.bundleOf
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import java.util.UUID

/**
 * iBeacon scan through the BLE scanner (layer 2 of the fleet plan, docs/FLEET.md in pugbuild-web).
 * Parses Apple's manufacturer data (0x004C, type 0x02, length 0x15) into UUID/major/minor and
 * only reports the UUIDs JS asked for. Needs BLUETOOTH_SCAN (API 31+) and fine location, both
 * requested by JS before start. Runs only while JS keeps it started.
 */
class BeaconScannerModule : Module() {
  private var scanner: BluetoothLeScanner? = null
  private var callback: ScanCallback? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("BeaconScanner")

    Events("onBeacons")

    Function("isAvailable") {
      val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
      context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE) &&
        manager?.adapter?.isEnabled == true
    }

    AsyncFunction("startRanging") { uuids: List<String> ->
      start(uuids.map { it.lowercase() }.toSet())
    }

    AsyncFunction("stopRanging") {
      stop()
    }

    OnDestroy {
      stop()
    }
  }

  private fun start(wanted: Set<String>) {
    stop()
    if (wanted.isEmpty()) return
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    val le = manager?.adapter?.bluetoothLeScanner ?: return
    val cb = object : ScanCallback() {
      override fun onScanResult(callbackType: Int, result: ScanResult) {
        val beacon = parse(result) ?: return
        if (beacon.uuid !in wanted) return
        sendEvent(
          "onBeacons",
          bundleOf(
            "beacons" to arrayListOf(
              bundleOf("uuid" to beacon.uuid, "major" to beacon.major, "minor" to beacon.minor, "rssi" to beacon.rssi),
            ),
          ),
        )
      }
    }
    try {
      le.startScan(null, ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_POWER).build(), cb)
      scanner = le
      callback = cb
    } catch (e: SecurityException) {
      // Permission not granted: JS keeps working without sightings.
    }
  }

  private fun stop() {
    val cb = callback ?: return
    try {
      scanner?.stopScan(cb)
    } catch (e: SecurityException) {
      // Bluetooth turned off meanwhile: nothing left to stop.
    }
    scanner = null
    callback = null
  }

  private data class Beacon(val uuid: String, val major: Int, val minor: Int, val rssi: Int)

  /** Apple iBeacon frame: 02 15 | 16-byte UUID | major (2) | minor (2) | tx power (1). */
  private fun parse(result: ScanResult): Beacon? {
    val data = result.scanRecord?.getManufacturerSpecificData(0x004C) ?: return null
    if (data.size < 23 || data[0] != 0x02.toByte() || data[1] != 0x15.toByte()) return null
    val buffer = ByteBuffer.wrap(data, 2, 16)
    val uuid = UUID(buffer.long, buffer.long).toString().lowercase()
    val major = ((data[18].toInt() and 0xFF) shl 8) or (data[19].toInt() and 0xFF)
    val minor = ((data[20].toInt() and 0xFF) shl 8) or (data[21].toInt() and 0xFF)
    return Beacon(uuid, major, minor, result.rssi)
  }
}
