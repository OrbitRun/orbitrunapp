import Foundation
import Capacitor
import CoreLocation

/// OrbitGeo — native iOS background GPS for Orbit Run.
///
/// Design:
///  - CLLocationManager with allowsBackgroundLocationUpdates = true and
///    pausesLocationUpdatesAutomatically = false.
///  - Every fix gets a persisted, monotonically increasing `sequence` and the
///    current `sessionId`.
///  - Points are appended to a disk-persisted ring buffer so they survive app
///    suspension / termination.
///  - JS drains with flush({ sessionId }) → { points, throughSequence, sessionId }
///    and then acknowledge({ sessionId, throughSequence }) which deletes only
///    the acknowledged prefix.
@objc(OrbitGeo)
public class OrbitGeo: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {

    // MARK: - CAPBridgedPlugin (Capacitor 8)

    public let identifier = "OrbitGeo"
    public let jsName = "OrbitGeo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "flush", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledge", returnType: CAPPluginReturnPromise)
    ]

    // MARK: - State

    private let manager = CLLocationManager()
    private let queue = DispatchQueue(label: "app.orbitrun.orbitgeo", qos: .utility)

    private static let bufferKey = "orbitgeo.buffer.v1"
    private static let sequenceKey = "orbitgeo.sequence.v1"
    private static let sessionKey = "orbitgeo.session.v1"
    private static let maxBuffer = 20_000

    private var buffer: [[String: Any]] = []
    private var sequence: Int = 0
    private var sessionId: String = ""
    private var running = false
    private var permissionCall: CAPPluginCall?

    // MARK: - Lifecycle

    public override func load() {
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        manager.distanceFilter = kCLDistanceFilterNone
        manager.activityType = .fitness
        manager.pausesLocationUpdatesAutomatically = false

        queue.sync {
            let d = UserDefaults.standard
            self.sequence = d.integer(forKey: OrbitGeo.sequenceKey)
            self.sessionId = d.string(forKey: OrbitGeo.sessionKey) ?? ""
            if let raw = d.data(forKey: OrbitGeo.bufferKey),
               let decoded = try? JSONSerialization.jsonObject(with: raw) as? [[String: Any]] {
                self.buffer = decoded
            }
        }
    }

    // MARK: - Persistence

    private func persistBufferLocked() {
        if let data = try? JSONSerialization.data(withJSONObject: buffer) {
            UserDefaults.standard.set(data, forKey: OrbitGeo.bufferKey)
        }
    }

    // MARK: - Permissions

    private func statusString(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .authorizedAlways: return "granted"
        case .authorizedWhenInUse: return "granted"
        case .denied, .restricted: return "denied"
        case .notDetermined: return "prompt"
        @unknown default: return "prompt"
        }
    }

    @objc func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["location": statusString(manager.authorizationStatus)])
    }

    @objc func requestPermissions(_ call: CAPPluginCall) {
        let status = manager.authorizationStatus
        if status != .notDetermined {
            // Already decided — upgrade to Always when possible, resolve now.
            if status == .authorizedWhenInUse {
                manager.requestAlwaysAuthorization()
            }
            call.resolve(["location": statusString(status)])
            return
        }
        // Wait for the delegate callback before resolving.
        permissionCall = call
        call.keepAlive = true
        DispatchQueue.main.async { [weak self] in
            self?.manager.requestAlwaysAuthorization()
        }
    }

    public func locationManagerDidChangeAuthorization(_ mgr: CLLocationManager) {
        let status = mgr.authorizationStatus
        guard status != .notDetermined, let call = permissionCall else { return }
        permissionCall = nil
        call.resolve(["location": statusString(status)])
        call.keepAlive = false
    }

    // MARK: - Start / Stop

    @objc func start(_ call: CAPPluginCall) {
        let newSession = call.getString("sessionId") ?? UUID().uuidString
        queue.sync {
            self.sessionId = newSession
            UserDefaults.standard.set(newSession, forKey: OrbitGeo.sessionKey)
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let status = self.manager.authorizationStatus
            if status == .denied || status == .restricted {
                call.reject("Location permission denied.")
                return
            }
            if CLLocationManager.locationServicesEnabled() == false {
                call.reject("Location services are disabled.")
                return
            }
            if status == .authorizedAlways {
                self.manager.allowsBackgroundLocationUpdates = true
            }
            self.manager.showsBackgroundLocationIndicator = true
            self.manager.startUpdatingLocation()
            self.running = true
            call.resolve(["started": true, "sessionId": newSession])
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.manager.stopUpdatingLocation()
            self.manager.allowsBackgroundLocationUpdates = false
            self.running = false
            call.resolve(["stopped": true])
        }
    }

    // MARK: - Buffer draining

    @objc func flush(_ call: CAPPluginCall) {
        let requested = call.getString("sessionId")
        queue.sync {
            let session = requested ?? self.sessionId
            let points = self.buffer.filter { ($0["sessionId"] as? String) == session }
            let through = points.compactMap { $0["sequence"] as? Int }.max() ?? -1
            call.resolve([
                "points": points,
                "throughSequence": through,
                "sessionId": session
            ])
        }
    }

    @objc func acknowledge(_ call: CAPPluginCall) {
        let through = call.getInt("throughSequence") ?? -1
        let requested = call.getString("sessionId")
        queue.sync {
            let session = requested ?? self.sessionId
            if through >= 0 {
                self.buffer.removeAll { p in
                    guard let s = p["sequence"] as? Int else { return true }
                    let sid = p["sessionId"] as? String
                    return sid == session && s <= through
                }
                self.persistBufferLocked()
            }
            call.resolve(["remaining": self.buffer.count])
        }
    }

    // MARK: - Location delegate

    public func locationManager(_ mgr: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard running else { return }
        var emitted: [[String: Any]] = []
        queue.sync {
            for loc in locations {
                self.sequence += 1
                let point: [String: Any] = [
                    "sessionId": self.sessionId,
                    "sequence": self.sequence,
                    "timestamp": Int(loc.timestamp.timeIntervalSince1970 * 1000),
                    "latitude": loc.coordinate.latitude,
                    "longitude": loc.coordinate.longitude,
                    "accuracy": loc.horizontalAccuracy,
                    "altitude": loc.altitude,
                    "altitudeAccuracy": loc.verticalAccuracy,
                    "speed": loc.speed,
                    "heading": loc.course
                ]
                self.buffer.append(point)
                emitted.append(point)
            }
            if self.buffer.count > OrbitGeo.maxBuffer {
                self.buffer.removeFirst(self.buffer.count - OrbitGeo.maxBuffer)
            }
            UserDefaults.standard.set(self.sequence, forKey: OrbitGeo.sequenceKey)
            self.persistBufferLocked()
        }
        for p in emitted {
            notifyListeners("orbitGeoPosition", data: p)
        }
    }

    public func locationManager(_ mgr: CLLocationManager, didFailWithError error: Error) {
        notifyListeners("orbitGeoError", data: ["message": error.localizedDescription])
    }
}
