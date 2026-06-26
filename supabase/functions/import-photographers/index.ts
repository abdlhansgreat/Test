// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Expected CSV row keys: email, full_name, business_name, base_city, starting_price, genres(|-separated), kind
interface RowIn {
  email: string;
  full_name?: string;
  business_name: string;
  base_city?: string;
  starting_price?: number | string;
  genres?: string;
  kind?: string;
  bio?: string;
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { rows, send_invites } = (await req.json()) as { rows: RowIn[]; send_invites?: boolean };
    if (!Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: "rows required" }), {
        status: 400, headers: { ...cors, "content-type": "application/json" },
      });
    }
    const createdIds: string[] = [];

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const created: string[] = [];
    const skipped: { email: string; reason: string }[] = [];

    // genre lookup
    const { data: allGenres } = await admin.from("genres").select("id, slug, name");
    const genreBySlug = new Map<string, string>();
    for (const g of allGenres ?? []) {
      genreBySlug.set(g.slug, g.id);
      genreBySlug.set(slugify(g.name), g.id);
    }

    for (const r of rows) {
      try {
        if (!r.email || !r.business_name) {
          skipped.push({ email: r.email ?? "(missing)", reason: "missing email or business_name" });
          continue;
        }

        const tempPassword = `Pl-${crypto.randomUUID().slice(0, 12)}`;
        const { data: userRes, error: uErr } = await admin.auth.admin.createUser({
          email: r.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { role: "photographer", full_name: r.full_name ?? r.business_name },
        });
        if (uErr || !userRes.user) {
          skipped.push({ email: r.email, reason: uErr?.message ?? "createUser failed" });
          continue;
        }
        const uid = userRes.user.id;

        // profiles row is auto-created by handle_new_user trigger; ensure role
        await admin.from("profiles").update({ role: "photographer", full_name: r.full_name ?? r.business_name }).eq("id", uid);

        // unique slug
        let baseSlug = slugify(r.business_name);
        let slug = baseSlug;
        let n = 1;
        while (true) {
          const { data: ex } = await admin.from("photographers").select("id").eq("slug", slug).maybeSingle();
          if (!ex) break;
          n += 1; slug = `${baseSlug}-${n}`;
        }

        const { data: photog, error: pErr } = await admin.from("photographers").insert({
          profile_id: uid,
          slug,
          business_name: r.business_name,
          kind: (r.kind as any) ?? "freelancer",
          base_city: r.base_city ?? null,
          starting_price: r.starting_price ? Number(r.starting_price) : null,
          bio: r.bio ?? null,
          verified: true,
          verification_source: "India Photographers Club",
          claimed: false,
          is_published: false,
          invite_status: "not_invited",
        }).select("id").single();
        if (pErr || !photog) {
          skipped.push({ email: r.email, reason: pErr?.message ?? "photographer insert failed" });
          continue;
        }
        createdIds.push(photog.id);



        // genres
        if (r.genres) {
          const slugs = r.genres.split(/[|,]/).map((s) => slugify(s.trim())).filter(Boolean);
          const links = slugs
            .map((s) => genreBySlug.get(s))
            .filter((id): id is string => !!id)
            .map((genre_id) => ({ photographer_id: photog.id, genre_id }));
          if (links.length > 0) await admin.from("photographer_genres").insert(links);
        }

        created.push(r.email);
      } catch (e: any) {
        skipped.push({ email: r.email ?? "(unknown)", reason: e.message ?? "unknown" });
      }
    }

    let invitedCount = 0;
    if (send_invites && createdIds.length > 0) {
      for (const pid of createdIds) {
        try {
          const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/invite-photographer`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ photographer_id: pid }),
          });
          if (r.ok) invitedCount += 1;
        } catch (_) { /* tolerate */ }
      }
    }

    return new Response(JSON.stringify({ created, skipped, invited: invitedCount, summary: { created: created.length, skipped: skipped.length, invited: invitedCount } }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "unknown" }), {
      status: 500, headers: { ...cors, "content-type": "application/json" },
    });
  }
});
