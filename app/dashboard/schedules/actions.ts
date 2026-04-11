"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAdminMembership } from "@/lib/invitations/server";
import {
  SCHEDULE_DUPLICATE_ERROR,
  ScheduleAssignmentValidationError,
  assertSchedulableCompanyMembers,
  buildScheduleAssignmentRows,
  getShiftTemplateForCompany,
  insertScheduleAssignmentRows,
} from "@/lib/scheduling/server";
import { createClient } from "@/lib/supabase/server";
import type { ShiftTemplate } from "@/src/types/scheduling";

type ActionResult = {
  ok: boolean;
  error?: string;
};

type AssignSchedulesActionResult = ActionResult & {
  assignmentCount?: number;
};

const timePattern = /^\d{2}:\d{2}(:\d{2})?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function nonNegativeIntegerField(label: string) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();

        if (!trimmed) {
          return Number.NaN;
        }

        if (!/^\d+$/.test(trimmed)) {
          return Number.NaN;
        }

        return Number(trimmed);
      }

      return value;
    },
    z
      .number({ error: `${label} must be a whole number.` })
      .min(0, `${label} cannot be negative.`)
      .refine(Number.isInteger, `${label} must be a whole number.`)
  );
}

const shiftTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required.").max(120),
  startTime: z.string().regex(timePattern, "Select a valid start time."),
  endTime: z.string().regex(timePattern, "Select a valid end time."),
  graceMinutes: nonNegativeIntegerField("Grace minutes"),
  breakMinutes: nonNegativeIntegerField("Break minutes"),
  secondBreakMinutes: nonNegativeIntegerField("Second break minutes"),
  isOvernight: z.boolean(),
  isActive: z.boolean(),
});

const updateShiftTemplateSchema = shiftTemplateSchema.extend({
  templateId: z.string().uuid("Invalid shift template."),
});

const assignSchedulesSchema = z
  .object({
    employeeIds: z
      .array(z.string().uuid("Invalid company member selected."))
      .min(1, "Select at least one company member.")
      .transform((employeeIds) => Array.from(new Set(employeeIds))),
    templateId: z.string().uuid("Select a valid shift template.").nullable(),
    startDate: z.string().regex(datePattern, "Select a valid start date."),
    endDate: z.string().regex(datePattern, "Select a valid end date."),
    isRestDay: z.boolean(),
    notes: z
      .string()
      .max(500, "Notes must be 500 characters or fewer.")
      .optional()
      .default(""),
  })
  .superRefine((value, ctx) => {
    if (value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after the start date.",
        path: ["endDate"],
      });
    }

    if (!value.isRestDay && !value.templateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a shift template or mark the assignment as a rest day.",
        path: ["templateId"],
      });
    }
  });

function normalizeNotes(notes: string | undefined) {
  const trimmed = notes?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function isPostgresError(error: unknown): error is { code?: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

async function requireAdminCompanyContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      error: "You must be signed in to manage schedules.",
    };
  }

  try {
    const adminMembership = await getAdminMembership(supabase, user.id);

    if (!adminMembership) {
      return {
        ok: false as const,
        error: "Only admins can manage schedules.",
      };
    }

    return {
      ok: true as const,
      supabase,
      user,
      adminMembership,
    };
  } catch {
    return {
      ok: false as const,
      error: "Unable to verify your company membership.",
    };
  }
}

export async function createShiftTemplateAction(
  input: z.input<typeof shiftTemplateSchema>
): Promise<ActionResult> {
  const parsed = shiftTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid shift template details.",
    };
  }

  const context = await requireAdminCompanyContext();
  if (!context.ok) {
    return context;
  }

  const { error } = await context.supabase.from("shift_templates").insert({
    company_id: context.adminMembership.company_id,
    name: parsed.data.name,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    grace_minutes: parsed.data.graceMinutes,
    break_minutes: parsed.data.breakMinutes,
    second_break_minutes: parsed.data.secondBreakMinutes,
    is_overnight: parsed.data.isOvernight,
    is_active: parsed.data.isActive,
  });

  if (error) {
    console.error("Create shift template error:", error);
    return {
      ok: false,
      error: "Unable to create the shift template right now.",
    };
  }

  revalidatePath("/dashboard/schedules");
  return { ok: true };
}

export async function updateShiftTemplateAction(
  input: z.input<typeof updateShiftTemplateSchema>
): Promise<ActionResult> {
  const parsed = updateShiftTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid shift template details.",
    };
  }

  const context = await requireAdminCompanyContext();
  if (!context.ok) {
    return context;
  }

  const { data, error } = await context.supabase
    .from("shift_templates")
    .update({
      name: parsed.data.name,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      grace_minutes: parsed.data.graceMinutes,
      break_minutes: parsed.data.breakMinutes,
      second_break_minutes: parsed.data.secondBreakMinutes,
      is_overnight: parsed.data.isOvernight,
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.templateId)
    .eq("company_id", context.adminMembership.company_id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Update shift template error:", error);
    return {
      ok: false,
      error: "Unable to update the shift template right now.",
    };
  }

  if (!data) {
    return {
      ok: false,
      error: "Shift template not found.",
    };
  }

  revalidatePath("/dashboard/schedules");
  return { ok: true };
}

export async function assignSchedulesAction(
  input: z.input<typeof assignSchedulesSchema>
): Promise<AssignSchedulesActionResult> {
  const parsed = assignSchedulesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid schedule assignment details.",
    };
  }

  const context = await requireAdminCompanyContext();
  if (!context.ok) {
    return context;
  }

  try {
    const assigneeCheck = await assertSchedulableCompanyMembers(
      context.supabase,
      context.adminMembership.company_id,
      parsed.data.employeeIds
    );

    if (!assigneeCheck.ok) {
      return {
        ok: false,
        error:
          assigneeCheck.invalidUserIds.length === 1
            ? "Schedules can only be assigned to eligible company members."
            : "Some selected users are not eligible for scheduling.",
      };
    }

    let template: ShiftTemplate | null = null;
    if (!parsed.data.isRestDay && parsed.data.templateId) {
      template = await getShiftTemplateForCompany(
        context.supabase,
        context.adminMembership.company_id,
        parsed.data.templateId
      );

      if (!template || !template.is_active) {
        return {
          ok: false,
          error: "Select an active shift template before assigning schedules.",
        };
      }
    }

    const rows = buildScheduleAssignmentRows({
      companyId: context.adminMembership.company_id,
      createdBy: context.user.id,
      employeeIds: parsed.data.employeeIds,
      range: {
        from: parsed.data.startDate,
        to: parsed.data.endDate,
      },
      notes: normalizeNotes(parsed.data.notes),
      isRestDay: parsed.data.isRestDay,
      template,
    });

    await insertScheduleAssignmentRows(context.supabase, rows);

    revalidatePath("/dashboard/schedules");
    return {
      ok: true,
      assignmentCount: rows.length,
    };
  } catch (error) {
    if (error instanceof ScheduleAssignmentValidationError) {
      return {
        ok: false,
        error: error.message,
      };
    }

    if (isPostgresError(error) && error.code === "23505") {
      return {
        ok: false,
        error: SCHEDULE_DUPLICATE_ERROR,
      };
    }

    console.error("Assign schedules action error:", error);
    return {
      ok: false,
      error: "Unable to finish the schedule assignment.",
    };
  }
}
