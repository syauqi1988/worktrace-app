// Verify registration response and store the new passkey.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { verifyRegistrationResponse } from "https://esm.sh/@simplewebauthn/server@10.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const body = await req.json();
    const attResp = body.response;
    const deviceLabel: string = body.device_label ?? "Device";

    const origin = req.headers.get("origin") ?? "";
    const url = new URL(origin || "https://example.com");
    const rpID = url.hostname;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get latest pending challenge
    const { data: chRow } = await admin
      .from("webauthn_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("purpose", "register")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!chRow) {
      return new Response(JSON.stringify({ error: "Challenge expired or not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verification = await verifyRegistrationResponse({
      response: attResp,
      expectedChallenge: chRow.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });


    if (!verification.verified || !verification.registrationInfo) {
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const registrationInfo = verification.registrationInfo;
    const credentialID: string = registrationInfo.credentialID;
    const credentialPublicKey: Uint8Array = registrationInfo.credentialPublicKey;
    const counter: number = registrationInfo.counter;
    const transports: string[] = attResp.response?.transports ?? [];

    // Encode public key as base64
    const pkB64 = btoa(String.fromCharCode(...credentialPublicKey));

    const { error: insertErr } = await admin.from("user_passkeys").insert({
      user_id: userId,
      credential_id: credentialID,
      public_key: pkB64,
      counter,
      transports,
      device_label: deviceLabel,
    });

    if (insertErr) {
      console.error("passkey insert failed", insertErr);
      return new Response(JSON.stringify({ error: "Could not save passkey" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cleanup challenge
    await admin.from("webauthn_challenges").delete().eq("id", chRow.id);

    return new Response(JSON.stringify({ verified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("register-verify error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
