import Foundation
import CoreLocation
import Capacitor

/**
 * OrbitGeo — native background GPS for Orbit Run (iOS).
 *
 * Uses CLLocationManager with background location updates so fixes keep
 * arriving while the screen is locked. Every accepted fix is stored in a
 * persisted ring buffer, so JavaScript can replay whatever it missed while
 * the WebView was suspended (`drain`), then prune it (`acknowledge`).
 *
 * No silent audio is used to keep JS alive — the native buffer is the
 * authoritative source of truth.
 */
@objc(OrbitGeo)
public class OrbitGeo: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OrbitGeo"
    public let jsName = "OrbitGeo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drain", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledge", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearBuffer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentPosition", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise)
    ]

    // MARK: - Constants

    private let maxBufferPoints = 20_000
    private let persistEveryNPoints = 25
    private let maxAcceptableAccuracy: CLLocationAccuracy = 100
    private let lowQualityAccuracy: CLLocationAccuracy = 50
    private let maxFixAgeSeconds: TimeInterval = 30
    private let cachedFixMaxAgeSeconds: TimeInterval = 15
    private let permissionTimeoutSeconds: TimeInterval = 20
    private let currentPositionTimeoutSeconds: TimeInterval = 15

    // MARK: - State

    private lazy var manager: CLLocationManager = {
        let m = CLLocationManager()
        m.delegate = self
        m.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        m.distanceFilter = 3
        m.activityType = .fitness
        m.pausesLocationUpdatesAutomatically = false
        return m
    }()

    private let queue = DispatchQueue(label: "com.orbitrun.orbitgeo.buffer")
    private var buffer: [[String: Any]] = []
    private var pointsSincePersist = 0
    private var isTracking = false

    /// Pending permission promise (held until iOS reports a final status).
    private var permissionCall: CAPPluginCall?
    private var wantsAlways = false
    private var permissionTimer: Timer?

    /// Pending one-shot getCurrentPosition promise.
    private var currentPositionCall: CAPPluginCall?
    private var currentPositionTimer: Timer?

    private var bufferURL: URL? {
        let dirs = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
        guard let dir = dirs.first else { return nil }
        if !FileManager.default.fileExists(atPath: dir.path) {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
        return dir.appendingPathComponent("orbitgeo-buffer.json")
    }

    override public func load() {
        loadBuffer()
    }

    // MARK: - Permissions

    private func authString(_ status: CLAuthorizationStatus) -> String {
        switch status {
        case .authorizedAlways: return "always"
        case .authorizedWhenInUse: return "whenInUse"
        case .denied, .restricted: return "denied"
        case .notDetermined: return "prompt"
        @unknown default: return "prompt"
        }
    }

    private func currentStatus() -> CLAuthorizationStatus {
        if #available(iOS 14.0, *) {
            return manager.authorizationStatus
        }
        return CLLocationManager.authorizationStatus()
    }

    @objc func checkPermissions(_ call: CAPPluginCall) {
        let s = authString(currentStatus())
        call.resolve(["location": s, "coarseLocation": s])
    }

    @objc func requestPermissions(_ call: CAPPluginCall) {
        let always = call.getBool("always") ?? true
        let status = currentStatus()

        // Already final for what we asked for.
        if status == .authorizedAlways || status == .denied || status == .restricted
            || (status == .authorizedWhenInUse && !always) {
            let s = authString(status)
            call.resolve(["location": s, "coarseLocation": s])
            return
        }

        holdPermissionCall(call, wantsAlways: always)

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if status == .notDetermined {
                self.manager.requestWhenInUseAuthorization()
            } else if status == .authorizedWhenInUse && always {
                self.manager.requestAlwaysAuthorization()
            }
        }
    }

    private func holdPermissionCall(_ call: CAPPluginCall, wantsAlways: Bool) {
        resolvePermissionCall(with: currentStatus(), force: false)
        call.keepAlive = true
        permissionCall = call
        self.wantsAlways = wantsAlways
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.permissionTimer?.invalidate()
            self.permissionTimer = Timer.scheduledTimer(
                withTimeInterval: self.permissionTimeoutSeconds, repeats: false
            ) { [weak self] _ in
                guard let self = self else { return }
                self.resolvePermissionCall(with: self.currentStatus(), force: true)
            }
        }
    }

    private func resolvePermissionCall(with status: CLAuthorizationStatus, force: Bool) {
        guard let call = permissionCall else { return }
        if !force {
            // Still waiting for the user to answer a prompt?
            if status == .notDetermined { return }
            if wantsAlways && status == .authorizedWhenInUse { return }
        }
        permissionTimer?.invalidate()
        permissionTimer = nil
        permissionCall = nil
        let s = authString(status)
        call.resolve(["location": s, "coarseLocation": s])
        call.keepAlive = false
    }

    // MARK: - Tracking

    @objc func start(_ call: CAPPluginCall) {
        let status = currentStatus()
        let s = authString(status)

        if status == .denied || status == .restricted {
            call.resolve(["started": false, "denied": true, "permission": s])
            return
        }
        if status == .notDetermined {
            call.resolve(["started": false, "requiresAlwaysPermission": true, "permission": s])
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.manager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
            self.manager.distanceFilter = 3
            self.manager.activityType = .fitness
            self.manager.pausesLocationUpdatesAutomatically = false

            if status == .authorizedAlways {
                self.manager.allowsBackgroundLocationUpdates = true
                if #available(iOS 11.0, *) {
                    self.manager.showsBackgroundLocationIndicator = true
                }
            }

            self.manager.startUpdatingLocation()
            self.isTracking = true

            // whenInUse still tracks in the foreground — tell JS to nudge the user.
            call.resolve([
                "started": true,
                "requiresAlwaysPermission": status != .authorizedAlways,
                "permission": s
            ])
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.manager.stopUpdatingLocation()
            self.manager.allowsBackgroundLocationUpdates = false
            if #available(iOS 11.0, *) {
                self.manager.showsBackgroundLocationIndicator = false
            }
            self.isTracking = false
            self.persistBuffer()
            call.resolve(["stopped": true])
        }
    }

    // MARK: - One-shot position

    @objc func getCurrentPosition(_ call: CAPPluginCall) {
        if let last = manager.location,
           last.horizontalAccuracy >= 0,
           Date().timeIntervalSince(last.timestamp) < cachedFixMaxAgeSeconds {
            call.resolve(dict(from: last))
            return
        }

        currentPositionCall?.reject("Superseded")
        currentPositionCall?.keepAlive = false
        call.keepAlive = true
        currentPositionCall = call

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.currentPositionTimer?.invalidate()
            self.currentPositionTimer = Timer.scheduledTimer(
                withTimeInterval: self.currentPositionTimeoutSeconds, repeats: false
            ) { [weak self] _ in
                guard let self = self, let pending = self.currentPositionCall else { return }
                self.currentPositionCall = nil
                pending.reject("Timed out waiting for a GPS fix")
                pending.keepAlive = false
            }
            self.manager.requestLocation()
        }
    }

    private func finishCurrentPosition(with location: CLLocation) {
        guard let call = currentPositionCall else { return }
        currentPositionTimer?.invalidate()
        currentPositionTimer = nil
        currentPositionCall = nil
        call.resolve(dict(from: location))
        call.keepAlive = false
    }

    // MARK: - Buffer API

    @objc func drain(_ call: CAPPluginCall) {
        let since = call.getDouble("since") ?? 0
        let ackThrough = call.getDouble("acknowledgeThrough")

        queue.sync {
            let points = buffer.filter { (($0["timestamp"] as? Double) ?? 0) > since }
            if let ack = ackThrough {
                buffer.removeAll { (($0["timestamp"] as? Double) ?? 0) <= ack }
                persistBufferLocked()
            }
            call.resolve(["points": points])
        }
    }

    @objc func acknowledge(_ call: CAPPluginCall) {
        let through = call.getDouble("through") ?? 0
        queue.sync {
            buffer.removeAll { (($0["timestamp"] as? Double) ?? 0) <= through }
            persistBufferLocked()
            call.resolve(["remaining": buffer.count])
        }
    }

    @objc func clearBuffer(_ call: CAPPluginCall) {
        queue.sync {
            buffer.removeAll()
            persistBufferLocked()
        }
        call.resolve()
    }

    // MARK: - Buffer internals

    private func append(_ point: [String: Any]) {
        queue.sync {
            buffer.append(point)
            if buffer.count > maxBufferPoints {
                buffer.removeFirst(buffer.count - maxBufferPoints)
            }
            pointsSincePersist += 1
            if pointsSincePersist >= persistEveryNPoints {
                pointsSincePersist = 0
                persistBufferLocked()
            }
        }
    }

    private func persistBuffer() {
        queue.sync { persistBufferLocked() }
    }

    /// Must be called from `queue`.
    private func persistBufferLocked() {
        guard let url = bufferURL else { return }
        guard JSONSerialization.isValidJSONObject(buffer) else { return }
        if let data = try? JSONSerialization.data(withJSONObject: buffer) {
            try? data.write(to: url, options: .atomic)
        }
    }

    private func loadBuffer() {
        guard let url = bufferURL, let data = try? Data(contentsOf: url) else { return }
        if let arr = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] {
            queue.sync { buffer = arr }
        }
    }

    // MARK: - Serialization

    private func dict(from l: CLLocation, lowQuality: Bool = false) -> [String: Any] {
        var d: [String: Any] = [
            "latitude": l.coordinate.latitude,
            "longitude": l.coordinate.longitude,
            "accuracy": l.horizontalAccuracy,
            "timestamp": l.timestamp.timeIntervalSince1970 * 1000
        ]
        d["altitude"] = l.verticalAccuracy >= 0 ? l.altitude : NSNull()
        d["altitudeAccuracy"] = l.verticalAccuracy >= 0 ? l.verticalAccuracy : NSNull()
        d["speed"] = l.speed >= 0 ? l.speed : NSNull()
        d["heading"] = l.course >= 0 ? l.course : NSNull()
        if lowQuality { d["lowQuality"] = true }
        return d
    }
}

// MARK: - CLLocationManagerDelegate

extension OrbitGeo: CLLocationManagerDelegate {
    public func locationManager(_ m: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let now = Date()
        let sorted = locations.sorted { $0.timestamp < $1.timestamp }

        // Resolve a pending one-shot with the most accurate usable fix.
        if currentPositionCall != nil {
            let usable = sorted.filter { $0.horizontalAccuracy >= 0 }
            if let best = usable.min(by: { $0.horizontalAccuracy < $1.horizontalAccuracy }) {
                finishCurrentPosition(with: best)
            }
        }

        guard isTracking else { return }

        for l in sorted {
            guard l.horizontalAccuracy >= 0,
                  l.horizontalAccuracy <= maxAcceptableAccuracy,
                  now.timeIntervalSince(l.timestamp) <= maxFixAgeSeconds else { continue }

            let low = l.horizontalAccuracy > lowQualityAccuracy
            let point = dict(from: l, lowQuality: low)
            append(point)
            notifyListeners("orbitLocation", data: point)
        }
    }

    public func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {
        if let call = currentPositionCall {
            currentPositionTimer?.invalidate()
            currentPositionTimer = nil
            currentPositionCall = nil
            call.reject(error.localizedDescription)
            call.keepAlive = false
        }
        notifyListeners("orbitLocationError", data: ["message": error.localizedDescription])
    }

    @available(iOS 14.0, *)
    public func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
        let status = m.authorizationStatus
        notifyListeners("orbitAuthChange", data: ["status": authString(status)])

        // If the user just granted When-In-Use and we want Always, ask now.
        if wantsAlways && status == .authorizedWhenInUse && permissionCall != nil {
            DispatchQueue.main.async { [weak self] in
                self?.manager.requestAlwaysAuthorization()
            }
        }
        resolvePermissionCall(with: status, force: false)

        if isTracking && status == .authorizedAlways {
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.manager.allowsBackgroundLocationUpdates = true
                if #available(iOS 11.0, *) {
                    self.manager.showsBackgroundLocationIndicator = true
                }
            }
        }
    }

    public func locationManager(_ m: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if #available(iOS 14.0, *) { return } // handled above
        notifyListeners("orbitAuthChange", data: ["status": authString(status)])
        if wantsAlways && status == .authorizedWhenInUse && permissionCall != nil {
            DispatchQueue.main.async { [weak self] in
                self?.manager.requestAlwaysAuthorization()
            }
        }
        resolvePermissionCall(with: status, force: false)
    }
}
