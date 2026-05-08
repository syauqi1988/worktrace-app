// Public: generate authentication options for a given email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { generateAuthenticationOptions } from "https://esm.sh/@simplewebauthn/server@10.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "email required" }), {
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

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    let allowCredentials: { id: string; transports?: any[] }[] = [];
    if (profile) {
      const { data: keys } = await admin
        .from("user_passkeys")
        .select("credential_id, transports")
        .eq("user_id", profile.id);
      allowCredentials = (keys ?? []).map((k) => ({
        id: k.credential_id,
        transports: k.transports ?? [],
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials,
    });

    // Persist challenge keyed by email
    await admin.from("webauthn_challenges").delete().eq("email", email.toLowerCase()).eq("purpose", "authenticate");
    await admin.from("webauthn_challenges").insert({
      email: email.toLowerCase(),
      challenge: options.challenge,
      purpose: "authenticate",
    });

    return new Response(JSON.stringify({ options, hasPasskey: allowCredentials.length > 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auth-options error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
