
// supabase/functions/kiosk/index.ts
// Routes:
//   GET  /kits
//   POST /checkout    { kit_id, borrower_name, borrower_email, days? }
//   POST /return      { kit_id, borrower_email }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-headers", "authorization, x-client-info, apikey, content-type");
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  return new Response(JSON.stringify(data), { ...init, headers });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "");

  try {
    if (req.method === "GET" && path.endsWith("/kits")) {
      const { data, error } = await supabase
        .from("kits_with_avail")
        .select("*")
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return json({ ok: true, data });
    }

    if (req.method === "POST" && path.endsWith("/checkout")) {
      const { kit_id, borrower_name, borrower_email, days } = await req.json();
      if (!kit_id || !borrower_name || !borrower_email) {
        return json({ ok: false, error: "Missing fields" }, { status: 400 });
      }

      const { data: kit, error: kerr } = await supabase
        .from("kits_with_avail")
        .select("kit_id,total_qty,available_qty")
        .eq("kit_id", kit_id)
        .single();
      if (kerr) throw kerr;
      if (!kit) return json({ ok: false, error: "Kit not found" }, { status: 404 });
      if (Number(kit.available_qty) <= 0) {
        return json({ ok: false, error: "Out of stock" }, { status: 409 });
      }

      const loanDays = Math.max(1, Number(days || 7));
      const due = new Date(Date.now() + loanDays * 24 * 3600 * 1000).toISOString();

      const { data: inserted, error: ierr } = await supabase
        .from("loans")
        .insert({
          kit_id,
          borrower_name,
          borrower_email,
          due_ts: due,
          status: "OPEN",
        })
        .select("loan_id,due_ts")
        .single();
      if (ierr) throw ierr;

      return json({ ok: true, data: { loan_id: inserted.loan_id, due: inserted.due_ts } });
    }

    if (req.method === "POST" && path.endsWith("/return")) {
      const { kit_id, borrower_email } = await req.json();
      if (!kit_id || !borrower_email) {
        return json({ ok: false, error: "Missing fields" }, { status: 400 });
      }

      const { data: loan, error: lerr } = await supabase
        .from("loans")
        .select("loan_id,status")
        .eq("kit_id", kit_id)
        .eq("borrower_email", borrower_email)
        .eq("status", "OPEN")
        .order("loan_id", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (lerr) throw lerr;
      if (!loan) return json({ ok: false, error: "Open loan not found" }, { status: 404 });

      const { error: uerr } = await supabase
        .from("loans")
        .update({ status: "RETURNED", returned_ts: new Date().toISOString() })
        .eq("loan_id", loan.loan_id);
      if (uerr) throw uerr;

      return json({ ok: true, data: { returned: true } });
    }

    return json({ ok: false, error: "Not found" }, { status: 404 });
  } catch (e: any) {
    console.error(e);
    return json({ ok: false, error: e.message ?? "Server error" }, { status: 500 });
  }
});
