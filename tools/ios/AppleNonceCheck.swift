import CryptoKit
import Foundation

@main
struct AppleNonceCheck {
    static func main() {
        let nonces = (0..<12).map { _ -> AppleNonce in
            guard let nonce = AppleNonce() else { fatalError("Unable to generate an Apple nonce") }
            return nonce
        }
        precondition(Set(nonces.map(\.raw)).count == nonces.count)
        for nonce in nonces {
            precondition(nonce.raw.utf8.count == 64)
            precondition(nonce.raw.utf8.allSatisfy { (48...57).contains($0) || (97...102).contains($0) })
            let expected = SHA256.hash(data: Data(nonce.raw.utf8)).description.split(separator: " ").last.map { String($0) }
            precondition(nonce.digest == expected)
        }
        print("Apple nonce format, uniqueness and SHA-256 binding passed.")
    }
}
