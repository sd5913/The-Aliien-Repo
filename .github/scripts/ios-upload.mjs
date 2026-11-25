import { createPrivateKey, sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const apiOrigin = 'https://api.appstoreconnect.apple.com';
const bundleId = 'org.sd5913.bothpls';

export function buildNumber(run, attempt) {
  if (!/^[1-9]\d{0,4}$/.test(run) || Number(run) > 99989 || !/^[1-9]\d{0,2}$/.test(attempt)) {
    throw new Error('GitHub run number or attempt exceeds the reserved iOS build-number range');
  }
  const serial = Number(run) * 1000 + Number(attempt);
  return [1 + Math.floor(serial / 10000), Math.floor(serial / 100) % 100, serial % 100].join('.');
}

export function individualToken(key, keyId, now = Math.floor(Date.now() / 1000)) {
  if (!key || !/^[A-Z0-9]{12}$/.test(keyId ?? '')) {
    throw new Error('Missing or invalid App Store Connect individual key configuration');
  }
  let privateKey;
  try {
    privateKey = createPrivateKey(Buffer.from(key, 'base64'));
  } catch {
    throw new Error('App Store Connect key is not a valid base64-encoded private key');
  }
  if (privateKey.asymmetricKeyType !== 'ec' || privateKey.asymmetricKeyDetails.namedCurve !== 'prime256v1') {
    throw new Error('Expected a P-256 App Store Connect key');
  }
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'ES256', kid: keyId, typ: 'JWT' });
  const payload = encode({ sub: 'user', aud: 'appstoreconnect-v1', iat: now, exp: now + 300 });
  const claims = header + '.' + payload;
  const signature = sign('sha256', Buffer.from(claims), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return claims + '.' + signature.toString('base64url');
}

export async function uploadBuild({ key, keyId, ipa, version, build, fileName = 'BothPls.ipa', fetch = globalThis.fetch, checkOnly = false }) {
  const request = async (method, path, data) => {
    const response = await fetch(apiOrigin + path, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(60000),
      headers: {
        Authorization: 'Bearer ' + individualToken(key, keyId),
        'Content-Type': 'application/json',
      },
      body: data && JSON.stringify({ data }),
    });
    if (!response.ok) throw new Error('App Store Connect ' + method + ' ' + path + ' returned HTTP ' + response.status);
    return response.json();
  };
  const apps = await request('GET', '/v1/apps?limit=2&fields%5Bapps%5D=bundleId');
  const app = apps.data?.[0];
  if (apps.data?.length !== 1 || apps.links?.next || app.attributes?.bundleId !== bundleId || !/^\d+$/.test(app.id)) {
    throw new Error('Expected the individual key to see exactly one app, ' + bundleId);
  }
  if (checkOnly) return app.id;
  if (!ipa?.length || !/^\d+\.\d+(?:\.\d+)?$/.test(version) || !/^[1-9]\d{0,3}\.\d{1,2}\.\d{1,2}$/.test(build)) {
    throw new Error('Expected a nonempty IPA and valid iOS version and build numbers');
  }

  const { data: upload } = await request('POST', '/v1/buildUploads', {
    type: 'buildUploads',
    attributes: { platform: 'IOS', cfBundleShortVersionString: version, cfBundleVersion: build },
    relationships: { app: { data: { type: 'apps', id: app.id } } },
  });
  const { data: file } = await request('POST', '/v1/buildUploadFiles', {
    type: 'buildUploadFiles',
    attributes: { fileName, fileSize: ipa.length, assetType: 'ASSET', uti: 'com.apple.ipa' },
    relationships: { buildUpload: { data: { type: 'buildUploads', id: upload.id } } },
  });

  const operations = file.attributes?.uploadOperations?.toSorted((a, b) => a.offset - b.offset);
  let offset = 0;
  for (const operation of operations ?? []) {
    const { length, method, url } = operation;
    const endpoint = new URL(url);
    if (method !== 'PUT' || endpoint.protocol !== 'https:' || endpoint.username || endpoint.password ||
        !Number.isSafeInteger(length) || length <= 0 || operation.offset !== offset || offset + length > ipa.length) {
      throw new Error('Invalid App Store Connect upload method, URL, or byte ranges');
    }
    offset += length;
  }
  if (offset !== ipa.length) throw new Error('App Store Connect upload byte ranges do not cover the entire IPA');

  for (const operation of operations) {
    const { url, offset, length, requestHeaders } = operation;
    const headers = new Headers(requestHeaders.map(({ name, value }) => [name, value]));
    const response = await fetch(url, {
      method: 'PUT',
      redirect: 'error',
      signal: AbortSignal.timeout(300000),
      headers,
      body: ipa.subarray(offset, offset + length),
    }).catch(() => {
      throw new Error('App Store Connect upload part request failed');
    });
    if (!response.ok) throw new Error('App Store Connect upload part returned HTTP ' + response.status);
  }
  const { data: committed } = await request('PATCH', '/v1/buildUploadFiles/' + encodeURIComponent(file.id), {
    type: 'buildUploadFiles', id: file.id, attributes: { uploaded: true },
  });
  if (!['COMPLETE', 'UPLOAD_COMPLETE'].includes(committed.attributes?.assetDeliveryState?.state)) {
    throw new Error('App Store Connect did not confirm the committed upload file; check its status before retrying');
  }
  return upload.id;
}

async function main([command, ipaPath, version, build]) {
  if (command === 'build-number') {
    console.log(buildNumber(process.env.GITHUB_RUN_NUMBER, process.env.GITHUB_RUN_ATTEMPT));
    return;
  }
  const auth = { key: process.env.ASC_KEY, keyId: process.env.ASC_KEY_ID };
  if (command === 'check-access') {
    const id = await uploadBuild({ ...auth, checkOnly: true });
    console.log('Individual key can see only BothPls (App Store Connect app ID ' + id + ').');
    return;
  }
  if (command !== 'upload' || !ipaPath) throw new Error('Expected build-number, check-access, or upload <ipa> <version> <build>');
  const id = await uploadBuild({ ...auth, ipa: await readFile(ipaPath), fileName: basename(ipaPath), version, build });
  console.log('App Store Connect accepted upload ' + id + ' for processing. Build ' + build + '.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    // Avoid logging request internals, bearer tokens, or pre-signed URLs.
    console.error(error instanceof TypeError ? 'App Store Connect request or response was invalid' : error.message);
    process.exitCode = 1;
  });
}
