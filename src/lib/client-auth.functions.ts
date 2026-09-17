import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const passwordSchema = z.string().min(8, "8 caractères minimum").max(200);
const tokenSchema = z.string().trim().min(16).max(200);
const codeSchema = z.string().trim().regex(/^\d{6}$/, "Code à 6 chiffres");

/** Validity of a password-creation link (setup or reset grant). */
export const checkPasswordToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashToken } = await import("@/lib/client-auth.server");

    const { data: row } = await supabaseAdmin
      .from("client_auth_tokens")
      .select("id, email, expires_at, used_at, kind")
      .eq("token_hash", await hashToken(data.token))
      .in("kind", ["setup", "grant"])
      .maybeSingle();

    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      return { valid: false as const };
    }
    return { valid: true as const, email: row.email };
  });

/** Sets the account password from a valid setup/grant token. */
export const setClientPassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ token: tokenSchema, password: passwordSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashToken } = await import("@/lib/client-auth.server");

    const { data: row } = await supabaseAdmin
      .from("client_auth_tokens")
      .select("id, user_id, email, expires_at, used_at")
      .eq("token_hash", await hashToken(data.token))
      .in("kind", ["setup", "grant"])
      .maybeSingle();

    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Ce lien n'est plus valable. Demandez-en un nouveau.");
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error("Impossible d'enregistrer le mot de passe.");

    await supabaseAdmin
      .from("client_auth_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    return { ok: true as const, email: row.email };
  });

/** Sends a 6-digit code by e-mail. Always reports success (no account probing). */
export const requestPasswordCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: emailSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashToken, randomCode, CODE_TTL_MS } = await import("@/lib/client-auth.server");

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = (list?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === data.email);
    if (!user) return { ok: true as const };

    const code = randomCode();
    await supabaseAdmin.from("client_auth_tokens").insert({
      user_id: user.id,
      email: data.email,
      kind: "reset",
      token_hash: await hashToken(`${data.email}:${code}`),
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    });

    const { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("client-password-code", data.email, {
      templateData: { name: profile?.full_name ?? "", code },
    });

    return { ok: true as const };
  });

/** Exchanges a valid code for a one-time password-reset token. */
export const verifyPasswordCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: emailSchema, code: codeSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashToken, randomToken, GRANT_TTL_MS } = await import("@/lib/client-auth.server");

    const { data: row } = await supabaseAdmin
      .from("client_auth_tokens")
      .select("id, user_id, email, expires_at, used_at")
      .eq("kind", "reset")
      .eq("email", data.email)
      .eq("token_hash", await hashToken(`${data.email}:${data.code}`))
      .maybeSingle();

    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Code invalide ou expiré.");
    }

    await supabaseAdmin
      .from("client_auth_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    const token = randomToken();
    await supabaseAdmin.from("client_auth_tokens").insert({
      user_id: row.user_id,
      email: row.email,
      kind: "grant",
      token_hash: await hashToken(token),
      expires_at: new Date(Date.now() + GRANT_TTL_MS).toISOString(),
    });

    return { token };
  });
