/**
 * Minimal Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) implementation
 * built on Web Crypto so it runs inside the edge/worker runtime.
 * Keys come exclusively from the project secrets (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).
 */

const encoder = new TextEncoder();
const enc = (s: string): Bytes => encoder.encode(s) as Bytes;

type Bytes = Uint8Array<ArrayBuffer>;

function alloc(n: number): Bytes {
  return new Uint8Array(new ArrayBuffer(n));
}

function b64urlToBytes(input: string): Bytes {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const raw = atob(b64);
  const out = alloc(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Bytes): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Bytes[]): Bytes {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = alloc(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

async function hmac(key: Bytes, data: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data)) as Bytes;
}

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, Uint8Array.from([1]) as Bytes));
  return okm.slice(0, length);
}

function vapidKeys() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return null;
  return { pub, priv };
}

async function vapidHeader(endpoint: string): Promise<{ Authorization: string } | null> {
  const keys = vapidKeys();
  if (!keys) return null;
  const pubBytes = b64urlToBytes(keys.pub);
  if (pubBytes.length !== 65) return null;
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: bytesToB64url(b64urlToBytes(keys.priv)),
    x: bytesToB64url(pubBytes.slice(1, 33)),
    y: bytesToB64url(pubBytes.slice(33, 65)),
    ext: true,
  };
  const signKey = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign",
  ]);
  const aud = new URL(endpoint).origin;
  const header = bytesToB64url(enc(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(
    enc(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: "mailto:contact@skalevisuals.com",
      }),
    ),
  );
  const signing = enc.encode(`${header}.${payload}`);
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signKey, signing),
  ) as Bytes;
  const jwt = `${header}.${payload}.${bytesToB64url(sig)}`;
  return { Authorization: `vapid t=${jwt}, k=${keys.pub}` };
}

async function encryptPayload(p256dh: string, auth: string, plaintext: string) {
  const uaPublic = b64urlToBytes(p256dh);
  const authSecret = b64urlToBytes(auth);

  const asKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", asKeys.publicKey)) as Bytes;
  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asKeys.privateKey, 256),
  ) as Bytes;

  const keyInfo = concat(enc("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);

  const salt = crypto.getRandomValues(alloc(16));
  const cek = await hkdf(salt, ikm, enc("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const body = concat(enc(plaintext), Uint8Array.from([2]) as Bytes);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, body),
  ) as Bytes;

  const rs = alloc(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, Uint8Array.from([asPublic.length]) as Bytes, asPublic, ciphertext);
}

export type PushPayload = { title?: string; body: string; url?: string; tag?: string };

/** Sends one push message. Returns the HTTP status (0 when not configured/failed locally). */
export async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<number> {
  try {
    const auth = await vapidHeader(sub.endpoint);
    if (!auth) return 0;
    const body = await encryptPayload(sub.p256dh, sub.auth, JSON.stringify(payload));
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        ...auth,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
      },
      body: body as BodyInit,
    });
    return res.status;
  } catch {
    return 0;
  }
}
