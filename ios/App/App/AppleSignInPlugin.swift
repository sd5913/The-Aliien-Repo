import AuthenticationServices
import Capacitor
import UIKit

final class BothPlsViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleSignInPlugin())
    }
}

@objc(AppleSignInPlugin)
final class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "AppleSignInPlugin"
    let jsName = "AppleSignIn"
    let pluginMethods = [CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)]

    private var authorization: AppleAuthorization?

    @objc func authorize(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.authorization == nil else {
                call.reject("An Apple authorization is already in progress.")
                return
            }
            guard let window = self.bridge?.viewController?.viewIfLoaded?.window,
                  window.windowScene?.activationState == .foregroundActive,
                  let nonce = AppleNonce() else {
                call.reject("Apple authorization is unavailable.")
                return
            }

            let authorization = AppleAuthorization(window: window, nonce: nonce) { [weak self] result in
                self?.authorization = nil
                switch result {
                case let .authorized(token):
                    call.resolve(["status": "authorized", "identityToken": token, "nonce": nonce.raw])
                case .cancelled:
                    call.resolve(["status": "cancelled"])
                case .failed:
                    call.reject("Apple authorization failed.")
                }
            }
            self.authorization = authorization
            authorization.start()
        }
    }
}

private final class AppleAuthorization: NSObject, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding {
    enum Result {
        case authorized(String)
        case cancelled
        case failed
    }

    private let window: UIWindow
    private let controller: ASAuthorizationController
    private var completion: ((Result) -> Void)?

    init(window: UIWindow, nonce: AppleNonce, completion: @escaping (Result) -> Void) {
        self.window = window
        self.completion = completion

        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.email]
        request.nonce = nonce.digest
        controller = ASAuthorizationController(authorizationRequests: [request])

        super.init()
        controller.delegate = self
        controller.presentationContextProvider = self
    }

    func start() {
        controller.performRequests()
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        window
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = credential.identityToken,
              let token = String(data: data, encoding: .utf8), !token.isEmpty else {
            finish(.failed)
            return
        }
        finish(.authorized(token))
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        finish((error as? ASAuthorizationError)?.code == .canceled ? .cancelled : .failed)
    }

    private func finish(_ result: Result) {
        DispatchQueue.main.async {
            let complete = self.completion
            self.completion = nil
            complete?(result)
        }
    }
}
