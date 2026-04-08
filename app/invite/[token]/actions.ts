"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hashInviteToken, normalizeEmail } from "@/lib/invitations/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AcceptInviteResult = {
  ok: boolean;
  error?: string;
  alreadyMember?: boolean;
};

const acceptInviteSchema = z.object({
  token: z.string().min(40).max(300),
  email: z.string().email().max(255),
  fullName: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128).optional(),
});

type InviteRow = {
  id: string;
  company_id: string;
  email: string;
  role: "employee";
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
};

type ProfileRow = {
  id: string;
  company_id: string | null;
  role: string | null;
};

type MembershipRow = {
  company_id: string;
  role: string;
};

export async function acceptInviteAction(input: {
  token: string;
  email: string;
  fullName: string;
  password?: string;
}): Promise<AcceptInviteResult> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid invite submission.",
    };
  }

  const payload = parsed.data;
  const tokenHash = hashInviteToken(payload.token);
  const email = normalizeEmail(payload.email);

  let admin;
  try {
    admin = createAdminClient();
  } catch (error: unknown) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Admin auth configuration is missing.",
    };
  }

  const { data: inviteData, error: inviteError } = await admin
    .from("invitations")
    .select("id, company_id, email, role, status, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (inviteError) {
    return { ok: false, error: "Invalid invitation token." };
  }

  const invite = (inviteData ?? null) as InviteRow | null;
  if (!invite) {
    return { ok: false, error: "Invalid invitation token." };
  }

  if (invite.status === "revoked") {
    return { ok: false, error: "This invitation has been revoked." };
  }

  if (invite.status === "accepted") {
    return { ok: false, error: "This invitation has already been accepted." };
  }

  if (invite.status === "expired" || new Date(invite.expires_at).getTime() < Date.now()) {
    await admin
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invite.id)
      .eq("status", "pending");
    return { ok: false, error: "This invitation has expired." };
  }

  if (normalizeEmail(invite.email) !== email) {
    return { ok: false, error: "Invite email does not match." };
  }

  const { data: existingProfileData, error: profileLookupError } = await admin
    .from("profiles")
    .select("id, company_id, role")
    .eq("email", email)
    .maybeSingle();

  if (profileLookupError) {
    return { ok: false, error: "Unable to look up invited account." };
  }

  const existingProfile = (existingProfileData ?? null) as ProfileRow | null;
  let userId = existingProfile?.id ?? null;
  let isNewAuthUser = false;

  if (!userId) {
    if (!payload.password) {
      return {
        ok: false,
        error: "Set a password to create your account from this invite.",
      };
    }

    const { data: createdUserData, error: createUserError } =
      await admin.auth.admin.createUser({
        email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.fullName,
        },
      });

    if (createUserError || !createdUserData.user) {
      return {
        ok: false,
        error: createUserError?.message ?? "Unable to create a user for this invite.",
      };
    }

    userId = createdUserData.user.id;
    isNewAuthUser = true;
  }

  const { data: membershipData, error: membershipLookupError } = await admin
    .from("company_memberships")
    .select("company_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipLookupError) {
    return { ok: false, error: "Unable to verify account membership." };
  }

  const existingMembership = (membershipData ?? null) as MembershipRow | null;

  if (
    existingMembership &&
    existingMembership.company_id &&
    existingMembership.company_id !== invite.company_id
  ) {
    return {
      ok: false,
      error:
        "This account already belongs to another company and cannot accept this invite.",
    };
  }

  if (!existingMembership) {
    const { error: membershipInsertError } = await admin
      .from("company_memberships")
      .insert({
        company_id: invite.company_id,
        user_id: userId,
        role: "employee",
      });

    if (membershipInsertError && membershipInsertError.code !== "23505") {
      return { ok: false, error: "Unable to create company membership." };
    }
  }

  if (existingProfile) {
    if (
      existingProfile.company_id &&
      existingProfile.company_id !== invite.company_id
    ) {
      return {
        ok: false,
        error:
          "This profile is already linked to another company and cannot accept this invite.",
      };
    }

    const nextRole = existingProfile.role === "admin" ? "admin" : "employee";
    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({
        email,
        full_name: payload.fullName,
        company_id: invite.company_id,
        role: nextRole,
      })
      .eq("id", userId);

    if (profileUpdateError) {
      return { ok: false, error: "Unable to update profile for this invite." };
    }
  } else {
    const { error: profileInsertError } = await admin.from("profiles").insert({
      id: userId,
      email,
      full_name: payload.fullName,
      company_id: invite.company_id,
      role: "employee",
    });

    if (profileInsertError && profileInsertError.code !== "23505") {
      return { ok: false, error: "Unable to create profile for this invite." };
    }
  }

  const { error: acceptError } = await admin
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .eq("status", "pending");

  if (acceptError) {
    return { ok: false, error: "Unable to mark invite as accepted." };
  }

  revalidatePath("/dashboard/settings");

  return {
    ok: true,
    alreadyMember: !isNewAuthUser && Boolean(existingMembership),
  };
}
