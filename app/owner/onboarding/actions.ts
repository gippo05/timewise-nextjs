"use server";

import "server-only";

import { randomBytes, timingSafeEqual } from "crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

export type CompanyOnboardingState = {
  ok: boolean;
  error?: string;
  companyName?: string;
  managerEmail?: string;
  managerName?: string;
  generatedPassword?: string;
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

const onboardingSchema = z.object({
  ownerKey: z.string().min(1, "Owner key is required."),
  companyName: z.string().trim().min(2, "Company name is required.").max(120),
  managerFullName: z.string().trim().min(2, "Manager name is required.").max(120),
  managerEmail: z.string().trim().toLowerCase().email("Enter a valid manager email.").max(255),
  temporaryPassword: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .pipe(
      z
        .string()
        .min(8, "Temporary password must be at least 8 characters.")
        .max(128, "Temporary password is too long.")
        .optional()
    ),
});

function configuredOwnerKey() {
  return process.env.TIMEWISE_OWNER_ONBOARDING_KEY ?? process.env.OWNER_ONBOARDING_KEY ?? "";
}

function verifyOwnerKey(input: string) {
  const expected = configuredOwnerKey();
  if (!expected) {
    return {
      ok: false as const,
      error:
        "Owner onboarding is not configured. Set TIMEWISE_OWNER_ONBOARDING_KEY before using this page.",
    };
  }

  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);

  if (
    inputBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(inputBuffer, expectedBuffer)
  ) {
    return { ok: false as const, error: "Invalid owner key." };
  }

  return { ok: true as const };
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

  return { firstName, lastName };
}

function generatedPassword() {
  return `${randomBytes(18).toString("base64url")}aA1!`;
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isPostgresError(error: unknown): error is { code?: string; message?: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

export async function onboardCompanyAction(
  _previousState: CompanyOnboardingState,
  formData: FormData
): Promise<CompanyOnboardingState> {
  const parsed = onboardingSchema.safeParse({
    ownerKey: formString(formData, "ownerKey"),
    companyName: formString(formData, "companyName"),
    managerFullName: formString(formData, "managerFullName"),
    managerEmail: formString(formData, "managerEmail"),
    temporaryPassword: formString(formData, "temporaryPassword"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid onboarding details.",
    };
  }

  const access = verifyOwnerKey(parsed.data.ownerKey);
  if (!access.ok) {
    return { ok: false, error: access.error };
  }

  const input = parsed.data;
  const admin = createAdminClient();
  const password = input.temporaryPassword ?? generatedPassword();
  const { firstName, lastName } = splitName(input.managerFullName);

  let createdUserId: string | null = null;
  let createdCompanyId: string | null = null;

  try {
    const { data: existingProfileData, error: profileLookupError } = await admin
      .from("profiles")
      .select("id, company_id, role")
      .eq("email", input.managerEmail)
      .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    const existingProfile = (existingProfileData ?? null) as ProfileRow | null;
    if (existingProfile?.company_id) {
      return {
        ok: false,
        error: "This manager email is already attached to a company.",
      };
    }

    const { data: companyData, error: companyError } = await admin
      .from("companies")
      .insert({ name: input.companyName })
      .select("id, name")
      .single();

    if (companyError) {
      if (companyError.code === "23505") {
        return { ok: false, error: "A company with this name already exists." };
      }

      throw companyError;
    }

    const company = companyData as { id: string; name: string };
    createdCompanyId = company.id;

    let managerUserId = existingProfile?.id ?? null;

    if (!managerUserId) {
      const { data: createdUserData, error: createUserError } =
        await admin.auth.admin.createUser({
          email: input.managerEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: input.managerFullName,
            first_name: firstName,
            last_name: lastName,
          },
        });

      if (createUserError || !createdUserData.user) {
        throw createUserError ?? new Error("Unable to create manager user.");
      }

      managerUserId = createdUserData.user.id;
      createdUserId = managerUserId;
    }

    const { data: existingMembershipData, error: membershipLookupError } = await admin
      .from("company_memberships")
      .select("company_id, role")
      .eq("user_id", managerUserId)
      .maybeSingle();

    if (membershipLookupError) {
      throw membershipLookupError;
    }

    const existingMembership = (existingMembershipData ?? null) as MembershipRow | null;
    if (existingMembership?.company_id) {
      return {
        ok: false,
        error: "This manager already has a company membership.",
      };
    }

    const { error: profileUpsertError } = await admin.from("profiles").upsert({
      id: managerUserId,
      first_name: firstName,
      last_name: lastName,
      full_name: input.managerFullName,
      email: input.managerEmail,
      company_id: company.id,
      role: "admin",
    });

    if (profileUpsertError) {
      throw profileUpsertError;
    }

    const { error: membershipInsertError } = await admin
      .from("company_memberships")
      .insert({
        company_id: company.id,
        user_id: managerUserId,
        role: "admin",
      });

    if (membershipInsertError) {
      throw membershipInsertError;
    }

    revalidatePath("/owner/onboarding");

    return {
      ok: true,
      companyName: company.name,
      managerEmail: input.managerEmail,
      managerName: input.managerFullName,
      generatedPassword: input.temporaryPassword ? undefined : password,
    };
  } catch (error) {
    console.error("Company onboarding failed:", error);

    if (createdUserId) {
      await admin.auth.admin.deleteUser(createdUserId).catch((deleteError) => {
        console.error("Failed to roll back manager auth user:", deleteError);
      });
    }

    if (createdCompanyId) {
      const { error: deleteCompanyError } = await admin
        .from("companies")
        .delete()
        .eq("id", createdCompanyId);

      if (deleteCompanyError) {
        console.error("Failed to roll back company:", deleteCompanyError);
      }
    }

    if (isPostgresError(error) && error.code === "23505") {
      return { ok: false, error: "A related company, profile, or membership already exists." };
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to onboard this company.",
    };
  }
}
