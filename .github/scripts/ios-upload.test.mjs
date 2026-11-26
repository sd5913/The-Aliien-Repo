import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { test } from 'node:test';
import { individualToken } from './ios-upload.mjs';

test('signs App Store Connect tokens with 10- and 12-character key IDs', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const key = Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64');
  for (const keyId of ['ABCD123456', 'ABCD123456XY']) {
    const [header, payload, signature] = individualToken(key, keyId, 1000).split('.');
    assert.equal(JSON.parse(Buffer.from(header, 'base64url')).kid, keyId);
    assert.equal(verify('sha256', Buffer.from(header + '.' + payload), {
      key: publicKey,
      dsaEncoding: 'ieee-p1363',
    }, Buffer.from(signature, 'base64url')), true);
  }
  assert.throws(() => individualToken(key, 'ABCD123456X!'), /invalid App Store Connect individual key/);
});
