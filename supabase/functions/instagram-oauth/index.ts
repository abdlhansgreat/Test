// Placeholder Instagram OAuth callback (Instagram API with Instagram Login).
// Wired in a later phase. Will:
//   1. Verify the `state` param against the photographer's profile_id.
//   2. Exchange `code` for a short-lived token at:
//      https://api.instagram.com/oauth/access_token
//      (scope: instagram_business_basic)
//   3. Upgrade to a long-lived token, fetch /me/media, and insert items into
//      public.portfolio_items with source='instagram'.
// For now this just returns a friendly placeholder so the redirect URI is reservable.

import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const body = {
    ok: !error,
    received: { code: code ? "<present>" : null, error },
    message:
      "Instagram OAuth scaffold. Token exchange and media import will be wired in a later phase.",
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
