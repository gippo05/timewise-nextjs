"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  generateInviteToken,
  getAdminMembership,
  listInvitesForCompany,
  normalizeEmail,
} from "@/lib/invitations/server";
import { createClient } from "@/lib/supabase/server";
import type { InvitationListItem } from "@/src/types/invitation";

type ActionResult = {
  ok: boolean;
  error?: string;
};

type CreateInviteResult = ActionResult & {
  invitation?: InvitationListItem;
  inviteUrl?: string;
};

type ListInvitesResult = ActionResult & {
  invitations: InvitationListItem[];
};

const createInviteSchema = z.object({
  email: z.string().email("Enter a valid email address.").max(255),
});

const revokeInviteSchema = z.object({
  invitationId: z.string().uuid(),
});

function inviteExpiryIso() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

async function resolveBaseUrl() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";

  if (!host) {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }

  return `${proto}://${host}`;
}

function mapCreateRowToInvitation(row: {
  id: string;
  company_id: string;
  email: string;
  role: "employee";
  status: "pending" | "accepted" | "revoked" | "expired";
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}): InvitationListItem {
  return {
    id: row.id,
    company_id: row.company_id,
    email: row.email,
    role: row.role,
    status: row.status,
    invited_by: row.invited_by,
    created_at: row.created_at,
    expires_at: row.expires_at,
    accepted_at: row.accepted_at,
  };
}

export async function createInviteAction(input: {
  email: string;
}): Promise<CreateInviteResult> {
  const parsed = createInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid email address.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "You must be signed in to invite employees." };
  }

  let adminMembership: Awaited<ReturnType<typeof getAdminMembership>>;
  try {
    adminMembership = await getAdminMembership(supabase, user.id);
  } catch {
    return { ok: false, error: "Unable to verify your company membership." };
  }

  if (!adminMembership) {
    return { ok: false, error: "Only admins can invite employees." };
  }

  const email = normalizeEmail(parsed.data.email);
  const expiresAt = inviteExpiryIso();

  const { error: expireError } = await supabase
    .from("invitations")
    .update({ status: "expired" })
    .eq("company_id", adminMembership.company_id)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  if (expireError) {
    return { ok: false, error: "Unable to prepare invitation state." };
  }

  const { token, tokenHash } = generateInviteToken();

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      company_id: adminMembership.company_id,
      email,
      role: "employee",
      invited_by: user.id,
      token_hash: tokenHash,
      status: "pending",
      expires_at: expiresAt,
    })
    .select(
      "id, company_id, email, role, status, invited_by, created_at, expires_at, accepted_at"
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error:
          "A pending invite already exists for this email in your company. Revoke it first or wait for expiration.",
      };
    }

    return { ok: false, error: "Unable to create the invite right now." };
  }

  const baseUrl = await resolveBaseUrl();
  revalidatePath("/dashboard/settings");

  return {
    ok: true,
    invitation: mapCreateRowToInvitation(data),
    inviteUrl: `${baseUrl}/invite/${token}`,
  };
}

export async function revokeInviteAction(input: {
  invitationId: string;
}): Promise<ActionResult> {
  const parsed = revokeInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid invitation id." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "You must be signed in." };
  }

  let adminMembership: Awaited<ReturnType<typeof getAdminMembership>>;
  try {
    adminMembership = await getAdminMembership(supabase, user.id);
  } catch {
    return { ok: false, error: "Unable to verify permissions." };
  }

  if (!adminMembership) {
    return { ok: false, error: "Only admins can revoke invites." };
  }

  const { error } = await supabase
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", parsed.data.invitationId)
    .eq("company_id", adminMembership.company_id)
    .eq("status", "pending");

  if (error) {
    return { ok: false, error: "Unable to revoke this invite." };
  }

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function listInvitesForSettingsAction(): Promise<ListInvitesResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, invitations: [], error: "Authentication required." };
  }

  let adminMembership: Awaited<ReturnType<typeof getAdminMembership>>;
  try {
    adminMembership = await getAdminMembership(supabase, user.id);
  } catch {
    return {
      ok: false,
      invitations: [],
      error: "Unable to verify membership.",
    };
  }

  if (!adminMembership) {
    return { ok: false, invitations: [], error: "Admin access required." };
  }

  try {
    const invitations = await listInvitesForCompany(
      supabase,
      adminMembership.company_id
    );

    return { ok: true, invitations };
  } catch {
    return {
      ok: false,
      invitations: [],
      error: "Unable to load invitations.",
    };
  }
}
