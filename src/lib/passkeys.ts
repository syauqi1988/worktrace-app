import { supabase } from '@/integrations/supabase/client';
import { startRegistration, startAuthentication, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';

export async function isPasskeySupported(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;
  try { return await platformAuthenticatorIsAvailable(); } catch { return false; }
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  let device = 'Device';
  if (/iPhone/.test(ua)) device = 'iPhone';
  else if (/iPad/.test(ua)) device = 'iPad';
  else if (/Android/.test(ua)) device = 'Android';
  else if (/Mac/.test(ua)) device = 'Mac';
  else if (/Windows/.test(ua)) device = 'Windows';
  else if (/Linux/.test(ua)) device = 'Linux';
  let browser = '';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  return browser ? `${device} — ${browser}` : device;
}

export async function enrollPasskey(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: optsResp, error } = await supabase.functions.invoke('passkey-register-options', { body: {} });
    if (error || !optsResp?.options) return { ok: false, error: error?.message || 'Cannot start enrollment' };
    const attResp = await startRegistration({ optionsJSON: optsResp.options });
    const { data: vResp, error: vErr } = await supabase.functions.invoke('passkey-register-verify', {
      body: { response: attResp, device_label: deviceLabel() },
    });
    if (vErr || !vResp?.verified) return { ok: false, error: vErr?.message || 'Verification failed' };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function signInWithPasskey(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { data: optsResp, error } = await supabase.functions.invoke('passkey-auth-options', { body: { email } });
    if (error || !optsResp?.options) return { ok: false, error: error?.message || 'Cannot start sign-in' };
    if (!optsResp.hasPasskey) return { ok: false, error: 'no_passkey' };
    const assertion = await startAuthentication({ optionsJSON: optsResp.options });
    const { data: vResp, error: vErr } = await supabase.functions.invoke('passkey-auth-verify', {
      body: { email, response: assertion },
    });
    if (vErr || !vResp?.verified || !vResp.session) {
      return { ok: false, error: vErr?.message || 'Verification failed' };
    }
    const { error: setErr } = await supabase.auth.setSession({
      access_token: vResp.session.access_token,
      refresh_token: vResp.session.refresh_token,
    });
    if (setErr) return { ok: false, error: setErr.message };
    return { ok: true };
  } catch (e: any) {
    if (e?.name === 'NotAllowedError') return { ok: false, error: 'cancelled' };
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function listMyPasskeys() {
  const { data, error } = await supabase
    .from('user_passkeys')
    .select('id, device_label, created_at, last_used_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deletePasskey(id: string) {
  const { error } = await supabase.from('user_passkeys').delete().eq('id', id);
  if (error) throw error;
}

const LAST_EMAIL_KEY = 'worktrace_last_email';
export function rememberEmail(email: string) { try { localStorage.setItem(LAST_EMAIL_KEY, email); } catch {} }
export function getRememberedEmail(): string { try { return localStorage.getItem(LAST_EMAIL_KEY) || ''; } catch { return ''; } }
