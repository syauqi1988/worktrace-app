// VAPID public key — safe to embed in client (publishable by design).
export const VAPID_PUBLIC_KEY =
  'BK8xraeumyJyTaJ_lchFS0CJ4MRc5bLQDRvOwZmj9-Y_waFZEk1Od7SU_H2GyK-5Cgkuy_OD14FJRa4P4_uav0M';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
