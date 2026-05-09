// Public: verify authentication response, return Supabase session tokens via magic link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { verifyAuthenticationResponse } from "https://esm.sh/@simplewebauthn/server@10.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, response } = await req.json();
    if (!email || !response) {
      return new Response(JSON.stringify({ error: "email and response required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") ?? "";
    const url = new URL(origin || "https://example.com");
    const rpID = url.hostname;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const emailLc = String(email).toLowerCase();

    const { data: chRow } = await admin
      .from("webauthn_challenges")
      .select("*")
      .eq("email", emailLc)
      .eq("purpose", "authenticate")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!chRow) {
      return new Response(JSON.stringify({ error: "No challenge" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the credential
    const credentialID: string = response.id;
    const { data: keyRow } = await admin
      .from("user_passkeys")
      .select("*")
      .eq("credential_id", credentialID)
      .maybeSingle();

    if (!keyRow) {
      return new Response(JSON.stringify({ error: "Unknown credential" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm credential belongs to email
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email")
      .eq("id", keyRow.user_id)
      .maybeSingle();
    if (!profile || (profile.email ?? "").toLowerCase() !== emailLc) {
      return new Response(JSON.stringify({ error: "Email mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode stored public key from base64
    const pkBytes = Uint8Array.from(atob(keyRow.public_key), (c) => c.charCodeAt(0));

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: chRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: keyRow.credential_id,
        publicKey: pkBytes,
        counter: Number(keyRow.counter),
        transports: keyRow.transports ?? [],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update counter & last_used
    await admin.from("user_passkeys").update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    }).eq("id", keyRow.id);

    // Cleanup challenge
    await admin.from("webauthn_challenges").delete().eq("id", chRow.id);

    // Issue a session: generate magic link, then verify the OTP token to get session tokens
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: emailLc,
    });
    if (linkErr || !linkData?.properties?.email_otp) {
      console.error("generateLink failed", linkErr);
      return new Response(JSON.stringify({ error: "Could not issue session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const otp = linkData.properties.email_otp;
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
      email: emailLc,
      token: otp,
      type: "email",
    });

    if (verifyErr || !verifyData.session) {
      console.error("verifyOtp failed", verifyErr);
      return new Response(JSON.stringify({ error: "Could not establish session" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      verified: true,
      session: {
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auth-verify error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
