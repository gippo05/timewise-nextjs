import "server-only";

import { createHash, randomBytes } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { InvitationListItem } from "@/src/types/invitation";

type MembershipRow = {
  company_id: string;
  role: string;
};

type InvitationRow = {
  id: string;
  company_id: string;
  email: string;
  role: "employee";
  status: "pending" | "accepted" | "revoked" | "expired";
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateInviteToken() {
  const token = randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashInviteToken(token),
  };
}

function mapInvitation(row: InvitationRow): InvitationListItem {
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

export async function getUserMembership(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("company_memberships")
    .select("company_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as MembershipRow | null;
}

export async function getAdminMembership(
  supabase: SupabaseClient,
  userId: string
) {
  const membership = await getUserMembership(supabase, userId);

  if (!membership || membership.role !== "admin") {
    return null;
  }

  return membership;
}

export async function listInvitesForCompany(
  supabase: SupabaseClient,
  companyId: string
) {
  const { data, error } = await supabase
    .from("invitations")
    .select(
      "id, company_id, email, role, status, invited_by, created_at, expires_at, accepted_at"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as InvitationRow[]).map(mapInvitation);
}
