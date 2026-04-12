import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import { createClient, type Session } from "@supabase/supabase-js";

import {
  getRelevantWorkDatesForClockIn,
  resolveLateMinutesForClockIn,
  type AttendanceScheduleAssignment,
} from "../../../lib/attendance.ts";

loadEnvConfig(process.cwd());

type CompanyRow = {
  id: string;
};

type AttendanceRecord = {
  id: string;
  created_at: string;
  clock_in: string | null;
  break: string | null;
  end_break: string | null;
  second_break: string | null;
  end_second_break: string | null;
  clock_out: string | null;
  late_minutes: number | null;
  schedule_assignment_id: string | null;
};

type ScheduleSegmentRecord = {
  id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  shift_template_id: string | null;
};

type ClockInScheduleAssignmentRecord = AttendanceScheduleAssignment;

type SeedUserInput = {
  companyId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "admin" | "employee";
  expectedStartTime: string;
  graceMinutes: number;
};

export type SeededUser = {
  id: string;
  email: string;
  password: string;
  role: "admin" | "employee";
  displayName: string;
};

export type SplitScheduleFixture = {
  companyId: string;
  workDate: string;
  admin: SeededUser;
  employee: SeededUser;
  cleanup: () => Promise<void>;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function createPublishableClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function resolveStorageKey() {
  const supabaseUrl = new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL"));
  return `sb-${supabaseUrl.hostname.split(".")[0]}-auth-token`;
}

function buildUniqueEmail(prefix: string) {
  return `playwright-${prefix}-${randomUUID()}@example.com`.toLowerCase();
}

function addUtcDays(dateInput: string, days: number) {
  const date = new Date(`${dateInput}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createCookieChunks(key: string, value: string, chunkSize = 3180) {
  let encodedValue = encodeURIComponent(value);

  if (encodedValue.length <= chunkSize) {
    return [{ name: key, value }];
  }

  const chunks: string[] = [];

  while (encodedValue.length > 0) {
    let encodedChunkHead = encodedValue.slice(0, chunkSize);
    const lastEscapePos = encodedChunkHead.lastIndexOf("%");

    if (lastEscapePos > chunkSize - 3) {
      encodedChunkHead = encodedChunkHead.slice(0, lastEscapePos);
    }

    let valueHead = "";

    while (encodedChunkHead.length > 0) {
      try {
        valueHead = decodeURIComponent(encodedChunkHead);
        break;
      } catch (error) {
        if (
          error instanceof URIError &&
          encodedChunkHead.at(-3) === "%" &&
          encodedChunkHead.length > 3
        ) {
          encodedChunkHead = encodedChunkHead.slice(0, encodedChunkHead.length - 3);
        } else {
          throw error;
        }
      }
    }

    chunks.push(valueHead);
    encodedValue = encodedValue.slice(encodedChunkHead.length);
  }

  return chunks.map((chunk, index) => ({
    name: `${key}.${index}`,
    value: chunk,
  }));
}

export function buildUtcDateAt(workDate: string, hours: number, minutes: number) {
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return new Date(`${workDate}T${hh}:${mm}:00.000Z`);
}

export function formatScheduleDateLabel(workDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${workDate}T00:00:00.000Z`));
}

export function calculateWorkedMinutes(record: AttendanceRecord) {
  if (!record.clock_in || !record.clock_out) {
    return 0;
  }

  const clockIn = new Date(record.clock_in).getTime();
  const clockOut = new Date(record.clock_out).getTime();

  let breakMs = 0;

  if (record.break && record.end_break) {
    breakMs += new Date(record.end_break).getTime() - new Date(record.break).getTime();
  }

  if (record.second_break && record.end_second_break) {
    breakMs +=
      new Date(record.end_second_break).getTime() - new Date(record.second_break).getTime();
  }

  return Math.max(0, Math.floor((clockOut - clockIn - breakMs) / 60_000));
}

async function createCompany(name: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("companies")
    .insert({ name })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data as CompanyRow;
}

async function createSeedUser(input: SeedUserInput): Promise<SeededUser> {
  const adminClient = createAdminClient();
  const fullName = `${input.firstName} ${input.lastName}`;

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      first_name: input.firstName,
      last_name: input.lastName,
      full_name: fullName,
    },
  });

  if (authError || !authData.user) {
    throw authError ?? new Error("Unable to create auth user for Playwright test.");
  }

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: authData.user.id,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      full_name: fullName,
      expected_start_time: input.expectedStartTime,
      grace_minutes: input.graceMinutes,
      company_id: input.companyId,
      role: input.role,
    },
    {
      onConflict: "id",
    }
  );

  if (profileError) {
    throw profileError;
  }

  const { error: membershipError } = await adminClient.from("company_memberships").insert({
    company_id: input.companyId,
    user_id: authData.user.id,
    role: input.role,
  });

  if (membershipError) {
    throw membershipError;
  }

  const { error: profileScheduleError } = await adminClient
    .from("profiles")
    .update({
      expected_start_time: input.expectedStartTime,
      grace_minutes: input.graceMinutes,
    })
    .eq("id", authData.user.id);

  if (profileScheduleError) {
    throw profileScheduleError;
  }

  return {
    id: authData.user.id,
    email: input.email,
    password: input.password,
    role: input.role,
    displayName: fullName,
  };
}

async function waitForPasswordAuthReady(email: string, password: string) {
  const publishableClient = createPublishableClient();
  const deadline = Date.now() + 20_000;
  let lastError: string | null = null;

  while (Date.now() < deadline) {
    const { error } = await publishableClient.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      await publishableClient.auth.signOut();
      return;
    }

    lastError = error.message;
    await sleep(500);
  }

  throw new Error(
    `Newly created Playwright user never became sign-in ready. Last auth error: ${lastError ?? "unknown error"}`
  );
}

function isRetryableAuthError(error: { message?: string; status?: number } | null | undefined) {
  if (!error) {
    return false;
  }

  return error.status === 429 || /rate limit/i.test(error.message ?? "");
}

async function signInWithPasswordForTests(email: string, password: string) {
  const publishableClient = createPublishableClient();
  const deadline = Date.now() + 30_000;
  let lastError: Error | null = null;

  while (Date.now() < deadline) {
    const { data, error } = await publishableClient.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.session) {
      return { publishableClient, session: data.session, user: data.user };
    }

    if (!isRetryableAuthError(error)) {
      throw error ?? new Error("Unable to sign in Playwright test user.");
    }

    lastError = error;
    await sleep(1_000);
  }

  throw lastError ?? new Error("Playwright sign-in kept hitting auth rate limits.");
}

export async function createAuthCookiesForBrowser(email: string, password: string, appUrl: string) {
  const { session } = await signInWithPasswordForTests(email, password);
  const sessionPayload = JSON.stringify(session satisfies Session);
  const encodedSession = `base64-${toBase64Url(sessionPayload)}`;

  return createCookieChunks(resolveStorageKey(), encodedSession).map(({ name, value }) => ({
    name,
    value,
    url: appUrl,
    sameSite: "Lax" as const,
    httpOnly: false,
  }));
}

export async function performClockedShiftForUser(input: {
  email: string;
  password: string;
  clockInAt: Date;
  clockOutAt: Date;
}) {
  const { publishableClient, user } = await signInWithPasswordForTests(
    input.email,
    input.password
  );

  if (!user) {
    throw new Error("Unable to authenticate the Playwright employee shift helper.");
  }

  const userId = user.id;
  const clockInISO = input.clockInAt.toISOString();
  const workDates = getRelevantWorkDatesForClockIn(clockInISO, "utc");

  const { data: activeAttendance, error: activeAttendanceError } = await publishableClient
    .from("attendance")
    .select("id, clock_out")
    .eq("user_id", userId)
    .is("clock_out", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeAttendanceError) {
    throw activeAttendanceError;
  }

  if (activeAttendance?.id) {
    throw new Error("Playwright employee already has an active attendance row.");
  }

  const [profileResponse, scheduleResponse] = await Promise.all([
    publishableClient.from("profiles").select("expected_start_time, grace_minutes").eq("id", userId).maybeSingle(),
    publishableClient
      .from("employee_schedule_assignments")
      .select("id, work_date, start_time, end_time, grace_minutes, is_overnight, is_rest_day")
      .eq("user_id", userId)
      .in("work_date", workDates)
      .order("work_date", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  const { data: profile, error: profileError } = profileResponse;

  if (profileError) {
    throw profileError;
  }

  if (scheduleResponse.error) {
    throw scheduleResponse.error;
  }

  const { scheduleAssignment, lateMinutes } = resolveLateMinutesForClockIn({
    clockInISO,
    scheduleAssignments: (scheduleResponse.data ?? []) as ClockInScheduleAssignmentRecord[],
    fallbackExpectedStartTime: profile?.expected_start_time ?? null,
    fallbackGraceMinutes: profile?.grace_minutes ?? 5,
    mode: "utc",
  });

  const { data: insertedAttendance, error: insertError } = await publishableClient
    .from("attendance")
    .insert([
      {
        clock_in: clockInISO,
        user_id: userId,
        late_minutes: lateMinutes ?? 0,
        schedule_assignment_id: scheduleAssignment?.id ?? null,
      },
    ])
    .select("id")
    .single();

  if (insertError || !insertedAttendance?.id) {
    throw insertError ?? new Error("Unable to insert the Playwright attendance row.");
  }

  const { error: updateError } = await publishableClient
    .from("attendance")
    .update({
      clock_out: input.clockOutAt.toISOString(),
    })
    .eq("id", insertedAttendance.id);

  if (updateError) {
    throw updateError;
  }
}

async function seedSplitScheduleAssignments(input: {
  companyId: string;
  employeeId: string;
  createdBy: string;
  workDate: string;
}) {
  const adminClient = createAdminClient();

  const { data: templates, error: templateError } = await adminClient
    .from("shift_templates")
    .insert([
      {
        company_id: input.companyId,
        name: `Morning split ${randomUUID()}`,
        start_time: "09:00:00",
        end_time: "13:00:00",
        grace_minutes: 0,
        break_minutes: 0,
        second_break_minutes: 0,
        is_overnight: false,
        is_active: true,
      },
      {
        company_id: input.companyId,
        name: `Evening split ${randomUUID()}`,
        start_time: "16:00:00",
        end_time: "19:00:00",
        grace_minutes: 0,
        break_minutes: 0,
        second_break_minutes: 0,
        is_overnight: false,
        is_active: true,
      },
    ])
    .select("id, start_time, end_time");

  if (templateError) {
    throw templateError;
  }

  const morningTemplate = templates?.find((template) => template.start_time === "09:00:00");
  const eveningTemplate = templates?.find((template) => template.start_time === "16:00:00");

  if (!morningTemplate || !eveningTemplate) {
    throw new Error("Unable to seed split-shift templates for Playwright test.");
  }

  const { error: assignmentError } = await adminClient
    .from("employee_schedule_assignments")
    .insert([
      {
        company_id: input.companyId,
        user_id: input.employeeId,
        shift_template_id: morningTemplate.id,
        work_date: input.workDate,
        start_time: "09:00:00",
        end_time: "13:00:00",
        grace_minutes: 0,
        break_minutes: 0,
        second_break_minutes: 0,
        is_rest_day: false,
        is_overnight: false,
        source: "template",
        notes: "Playwright split-shift morning segment",
        created_by: input.createdBy,
      },
      {
        company_id: input.companyId,
        user_id: input.employeeId,
        shift_template_id: eveningTemplate.id,
        work_date: input.workDate,
        start_time: "16:00:00",
        end_time: "19:00:00",
        grace_minutes: 0,
        break_minutes: 0,
        second_break_minutes: 0,
        is_rest_day: false,
        is_overnight: false,
        source: "template",
        notes: "Playwright split-shift evening segment",
        created_by: input.createdBy,
      },
    ]);

  if (assignmentError) {
    throw assignmentError;
  }
}

export async function createSplitScheduleFixture(input?: {
  workDate?: string;
  employeeExpectedStartTime?: string;
  employeeGraceMinutes?: number;
}) {
  const adminClient = createAdminClient();
  const workDate = input?.workDate ?? new Date().toISOString().slice(0, 10);
  const company = await createCompany(`Playwright Split Shift ${randomUUID()}`);
  const createdUserIds: string[] = [];

  async function cleanup() {
    for (const userId of createdUserIds) {
      try {
        await adminClient.auth.admin.deleteUser(userId);
      } catch {
        // Best-effort cleanup keeps later deletions running even if one user was already removed.
      }
    }

    await adminClient.from("companies").delete().eq("id", company.id);
  }

  try {
    const adminUser = await createSeedUser({
      companyId: company.id,
      email: buildUniqueEmail("split-admin"),
      password: "Timewise!12345",
      firstName: "Split",
      lastName: "Admin",
      role: "admin",
      expectedStartTime: "09:00:00",
      graceMinutes: 0,
    });
    createdUserIds.push(adminUser.id);
    await waitForPasswordAuthReady(adminUser.email, adminUser.password);

    const employeeUser = await createSeedUser({
      companyId: company.id,
      email: buildUniqueEmail("split-employee"),
      password: "Timewise!12345",
      firstName: "Split",
      lastName: "Employee",
      role: "employee",
      expectedStartTime: input?.employeeExpectedStartTime ?? "09:00:00",
      graceMinutes: input?.employeeGraceMinutes ?? 0,
    });
    createdUserIds.push(employeeUser.id);
    await waitForPasswordAuthReady(employeeUser.email, employeeUser.password);

    await seedSplitScheduleAssignments({
      companyId: company.id,
      employeeId: employeeUser.id,
      createdBy: adminUser.id,
      workDate,
    });

    return {
      companyId: company.id,
      workDate,
      admin: adminUser,
      employee: employeeUser,
      cleanup,
    } satisfies SplitScheduleFixture;
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function listAttendanceRecordsForDay(userId: string, workDate: string) {
  const adminClient = createAdminClient();
  const nextDate = addUtcDays(workDate, 1);
  const { data, error } = await adminClient
    .from("attendance")
    .select(
      "id, created_at, clock_in, break, end_break, second_break, end_second_break, clock_out, late_minutes, schedule_assignment_id"
    )
    .eq("user_id", userId)
    .gte("clock_in", `${workDate}T00:00:00.000Z`)
    .lt("clock_in", `${nextDate}T00:00:00.000Z`)
    .order("clock_in", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as AttendanceRecord[];
}

export async function listScheduleSegmentsForDay(userId: string, workDate: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("employee_schedule_assignments")
    .select("id, work_date, start_time, end_time, shift_template_id")
    .eq("user_id", userId)
    .eq("work_date", workDate)
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ScheduleSegmentRecord[];
}
