
-- Passkeys (WebAuthn credentials) per user/device
CREATE TABLE public.user_passkeys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL, -- base64url-encoded COSE public key
  counter bigint NOT NULL DEFAULT 0,
  transports text[] NOT NULL DEFAULT '{}',
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX idx_user_passkeys_user ON public.user_passkeys(user_id);

ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own passkeys"
  ON public.user_passkeys FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own passkeys"
  ON public.user_passkeys FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE policies: only edge functions (service role) write here.

-- Short-lived challenges for register + auth ceremonies
CREATE TABLE public.webauthn_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,             -- used for auth ceremony lookup
  user_id uuid,           -- used for register ceremony
  challenge text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('register','authenticate')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

CREATE INDEX idx_webauthn_challenges_email ON public.webauthn_challenges(email);
CREATE INDEX idx_webauthn_challenges_user ON public.webauthn_challenges(user_id);

ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- No policies: only service role accesses this table.

-- Profile flag: don't re-prompt user to enroll biometrics
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS passkey_prompt_dismissed boolean NOT NULL DEFAULT false;
