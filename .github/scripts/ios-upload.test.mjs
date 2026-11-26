import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { test } from 'node:test';
import { individualToken } from './ios-upload.mjs';

test('signs an App Store Connect token with a 12-character individual key ID', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const key = Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64');
  const keyId = 'ABCD123456XY';
  const [header, payload, signature] = individualToken(key, keyId, 1000).split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url')).kid, keyId);
  assert.equal(verify('sha256', Buffer.from(header + '.' + payload), {
    key: publicKey,
    dsaEncoding: 'ieee-p1363',
  }, Buffer.from(signature, 'base64url')), true);
  assert.throws(() => individualToken(key, 'ABCD123456X!'), /invalid App Store Connect individual key/);
});
