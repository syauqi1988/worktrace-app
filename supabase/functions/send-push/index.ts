import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC = 'BK8xraeumyJyTaJ_lchFS0CJ4MRc5bLQDRvOwZmj9-Y_waFZEk1Od7SU_H2GyK-5Cgkuy_OD14FJRa4P4_uav0M';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@worktrace.app';

// ---------- helpers ----------
function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function strToBytes(s: string) { return new TextEncoder().encode(s); }
function concat(...arrs: Uint8Array[]) {
  const len = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

// ---------- VAPID JWT (ES256) ----------
async function importVapidPrivateKey(): Promise<CryptoKey> {
  const d = b64urlToBytes(VAPID_PRIVATE);
  const pub = b64urlToBytes(VAPID_PUBLIC); // 0x04 || X || Y
  const x = pub.slice(1, 33);
  const y = pub.slice(33, 65);
  const jwk = {
    kty: 'EC', crv: 'P-256',
    d: bytesToB64Url(d), x: bytesToB64Url(x), y: bytesToB64Url(y),
    ext: true,
  };
  return await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function vapidJwt(audience: string) {
  const header = bytesToB64Url(strToBytes(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bytesToB64Url(strToBytes(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: VAPID_SUBJECT,
  })));
  const data = strToBytes(`${header}.${payload}`);
  const key = await importVapidPrivateKey();
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data));
  return `${header}.${payload}.${bytesToB64Url(sig)}`;
}

// ---------- payload encryption (aes128gcm, RFC 8291) ----------
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const baseKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    baseKey, length * 8
  );
  return new Uint8Array(bits);
}

async function encryptPayload(payload: string, p256dhB64: string, authB64: string) {
  const clientPublic = b64urlToBytes(p256dhB64); // 65 bytes uncompressed
  const authSecret = b64urlToBytes(authB64);

  // Generate ephemeral ECDH key pair
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const ephPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey)); // 65 bytes

  // Import client public for ECDH
  const clientKey = await crypto.subtle.importKey(
    'raw', clientPublic, { name: 'ECDH', namedCurve: 'P-256' }, true, []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, ephemeral.privateKey, 256)
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK_key = HKDF(authSecret, sharedSecret, "WebPush: info\0" || ua_public || as_public, 32)
  const keyInfo = concat(
    strToBytes('WebPush: info\0'),
    clientPublic,
    ephPubRaw,
  );
  const ikm = await hkdf(authSecret, sharedSecret, keyInfo, 32);

  // CEK = HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
  const cek = await hkdf(salt, ikm, concat(strToBytes('Content-Encoding: aes128gcm\0')), 16);
  // NONCE = HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
  const nonce = await hkdf(salt, ikm, concat(strToBytes('Content-Encoding: nonce\0')), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);

  // Plaintext + 0x02 padding delimiter (one record)
  const plaintext = concat(strToBytes(payload), new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext)
  );

  // Header: salt(16) || rs(4 BE = 4096) || idlen(1) || keyid (ephPub raw 65 bytes)
  const rs = new Uint8Array([0x00, 0x00, 0x10, 0x00]);
  const idlen = new Uint8Array([ephPubRaw.length]);
  return concat(salt, rs, idlen, ephPubRaw, ciphertext);
}

// ---------- main ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { user_id, title, body, link } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload = JSON.stringify({ title: title || 'WorkTrace', body: body || '', link: link || '/' });

    let sent = 0;
    const expired: string[] = [];

    for (const s of subs) {
      try {
        const url = new URL(s.endpoint);
        const audience = `${url.protocol}//${url.host}`;
        const jwt = await vapidJwt(audience);
        const encrypted = await encryptPayload(payload, s.p256dh, s.auth);

        const res = await fetch(s.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'TTL': '86400',
            'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC}`,
          },
          body: encrypted,
        });

        if (res.status === 404 || res.status === 410) {
          expired.push(s.id);
        } else if (res.ok) {
          sent++;
        } else {
          await res.text(); // drain
        }
      } catch (e) {
        console.error('push error', e);
      }
    }

    if (expired.length) {
      await admin.from('push_subscriptions').delete().in('id', expired);
    }

    return new Response(JSON.stringify({ sent, expired: expired.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
