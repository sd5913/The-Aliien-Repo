import CryptoKit
import Foundation
import Security

struct AppleNonce {
    let raw: String
    let digest: String

    init?() {
        var bytes = [UInt8](repeating: 0, count: 32)
        let status = bytes.withUnsafeMutableBytes { buffer -> OSStatus in
            guard let address = buffer.baseAddress else { return errSecParam }
            return SecRandomCopyBytes(kSecRandomDefault, buffer.count, address)
        }
        guard status == errSecSuccess else { return nil }
        let raw = Self.hex(bytes)
        self.raw = raw
        digest = Self.hex(SHA256.hash(data: Data(raw.utf8)))
    }

    private static func hex(_ bytes: some Sequence<UInt8>) -> String {
        bytes.map { String(format: "%02x", Int($0)) }.joined()
    }
}
