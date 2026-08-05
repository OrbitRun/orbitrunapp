import Capacitor
import UIKit
import WebKit

/// Native host for the Capacitor WebView. The host and WebView deliberately
/// share Orbit's canvas color so resize and safe-area transitions cannot reveal
/// the default white UIKit background.
@objc(OrbitViewController)
public final class OrbitViewController: CAPBridgeViewController {
    private let orbitBackground = UIColor(
        red: 2.0 / 255.0,
        green: 11.0 / 255.0,
        blue: 15.0 / 255.0,
        alpha: 1.0
    )

    public override func viewDidLoad() {
        super.viewDidLoad()
        applyOrbitBackground()
    }

    public override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        applyOrbitBackground()
    }

    private func applyOrbitBackground() {
        view.backgroundColor = orbitBackground
        webView?.isOpaque = true
        webView?.backgroundColor = orbitBackground
        webView?.scrollView.backgroundColor = orbitBackground
    }
}