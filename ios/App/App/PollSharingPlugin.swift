import Capacitor
import UIKit

@objc(PollSharingPlugin)
final class PollSharingPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "PollSharingPlugin"
    let jsName = "PollSharing"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "detectLink", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readLink", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise)
    ]

    override func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(sceneDidActivate(_:)),
                                               name: UIScene.didActivateNotification, object: nil)
    }

    @objc private func sceneDidActivate(_ notification: Notification) {
        notifyListeners("foreground", data: nil)
    }

    @objc func detectLink(_ call: CAPPluginCall) {
        Task { @MainActor in
            let board = UIPasteboard.general
            let revision = board.changeCount
            // The pattern API reveals only whether there is a URL, not its contents.
            let pattern = \UIPasteboard.DetectedValues.probableWebURL
            let detected = (try? await board.detectedPatterns(for: [pattern]))?.contains(pattern) ?? false
            call.resolve(["hasLink": revision == board.changeCount && (detected || board.hasURLs),
                          "revision": revision])
        }
    }

    @objc func readLink(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let board = UIPasteboard.general
            guard call.getInt("revision") == board.changeCount else {
                call.resolve(["changed": true])
                return
            }
            let value = board.hasURLs ? board.url?.absoluteString : board.string
            call.resolve(value.map { ["value": $0] } ?? [:])
        }
    }

    @objc func share(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController,
                  presenter.viewIfLoaded?.window != nil, presenter.presentedViewController == nil else {
                call.reject("Share sheet is unavailable")
                return
            }

            let item: Any
            if let png = call.getString("png"), let data = Data(base64Encoded: png), let image = UIImage(data: data) {
                item = image
            } else if let link = call.getString("url"), let url = URL(string: link), url.scheme == "https" {
                item = url
            } else {
                call.reject("No valid share item")
                return
            }

            let sheet = UIActivityViewController(activityItems: [item], applicationActivities: nil)
            if let popover = sheet.popoverPresentationController {
                popover.sourceView = presenter.view
                let bounds = presenter.view.bounds
                popover.sourceRect = CGRect(x: bounds.midX, y: bounds.midY, width: 1, height: 1)
                popover.permittedArrowDirections = []
            }
            sheet.completionWithItemsHandler = { _, _, _, error in
                if error != nil { call.reject("Could not share item") } else { call.resolve() }
            }
            presenter.present(sheet, animated: true)
        }
    }
}
