"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarRange,
  Clock3,
  MoonStar,
  PencilLine,
  Plus,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  assignSchedulesAction,
  createShiftTemplateAction,
  updateShiftTemplateAction,
} from "@/app/dashboard/schedules/actions";
import PageHeader from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ScheduleAssignment,
  ScheduleAssignmentWithAssignee,
  ScheduleAssignee,
  ScheduleRange,
  ShiftTemplate,
} from "@/src/types/scheduling";

type TemplateFormState = {
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: string;
  breakMinutes: string;
  secondBreakMinutes: string;
  isOvernight: boolean;
  isActive: boolean;
};

type AssignmentFormState = {
  employeeIds: string[];
  templateId: string;
  startDate: string;
  endDate: string;
  isRestDay: boolean;
  notes: string;
};

type SchedulesClientProps = {
  isAdmin: boolean;
  range: ScheduleRange;
  templates: ShiftTemplate[];
  assignees: ScheduleAssignee[];
  employeeAssignments: ScheduleAssignment[];
  companyAssignments: ScheduleAssignmentWithAssignee[];
  companySchedulePage: number;
  companySchedulePageSize: number;
  companyScheduleHasNextPage: boolean;
  companyScheduleHasPreviousPage: boolean;
};

function toTimeInputValue(value: string) {
  return value.slice(0, 5);
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatTimeLabel(value: string) {
  const [rawHours, rawMinutes] = value.slice(0, 5).split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function countDaysInRange(range: ScheduleRange) {
  const start = new Date(`${range.from}T00:00:00Z`);
  const end = new Date(`${range.to}T00:00:00Z`);
  const differenceInMs = end.getTime() - start.getTime();

  return Math.floor(differenceInMs / (1000 * 60 * 60 * 24)) + 1;
}

function createEmptyTemplateFormState(): TemplateFormState {
  return {
    name: "",
    startTime: "09:00",
    endTime: "18:00",
    graceMinutes: "0",
    breakMinutes: "60",
    secondBreakMinutes: "0",
    isOvernight: false,
    isActive: true,
  };
}

function createTemplateFormState(template: ShiftTemplate): TemplateFormState {
  return {
    name: template.name,
    startTime: toTimeInputValue(template.start_time),
    endTime: toTimeInputValue(template.end_time),
    graceMinutes: String(template.grace_minutes),
    breakMinutes: String(template.break_minutes),
    secondBreakMinutes: String(template.second_break_minutes),
    isOvernight: template.is_overnight,
    isActive: template.is_active,
  };
}

function createAssignmentFormState(
  range: ScheduleRange,
  templates: ShiftTemplate[]
): AssignmentFormState {
  const activeTemplate = templates.find((template) => template.is_active);

  return {
    employeeIds: [],
    templateId: activeTemplate?.id ?? "",
    startDate: range.from,
    endDate: range.from,
    isRestDay: false,
    notes: "",
  };
}

function renderBreakSummary(assignment: ScheduleAssignment) {
  if (assignment.is_rest_day) {
    return "Rest day";
  }

  const segments: string[] = [];
  if (assignment.break_minutes > 0) {
    segments.push(`${assignment.break_minutes} min`);
  }
  if (assignment.second_break_minutes > 0) {
    segments.push(`${assignment.second_break_minutes} min`);
  }

  return segments.length > 0 ? segments.join(" + ") : "No breaks";
}

function sourceLabel(source: ScheduleAssignment["source"]) {
  if (source === "batch") {
    return "Batch";
  }

  if (source === "template") {
    return "Template";
  }

  return "Manual";
}

function scheduleLabel(assignment: ScheduleAssignment) {
  if (assignment.is_rest_day) {
    return "Rest day";
  }

  return `${formatTimeLabel(assignment.start_time)} to ${formatTimeLabel(assignment.end_time)}`;
}

function assigneeLabel(assignment: ScheduleAssignment | ScheduleAssignmentWithAssignee) {
  if (!("assignee" in assignment)) {
    return null;
  }

  if (assignment.assignee?.display_name) {
    return assignment.assignee.display_name;
  }

  return `Former member (${assignment.user_id.slice(0, 8)})`;
}

function AssignmentRows({
  assignments,
  showAssignee,
}: {
  assignments: Array<ScheduleAssignment | ScheduleAssignmentWithAssignee>;
  showAssignee: boolean;
}) {
  if (assignments.length === 0) {
    return (
      <div className="app-surface-subtle rounded-[20px] border border-dashed px-6 py-10 text-center">
        <p className="text-base font-semibold text-foreground">No schedules in this range</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Assigned schedule rows will appear here once they exist.
        </p>
      </div>
    );
  }

  return (
    <div className="app-surface-strong overflow-hidden rounded-[20px] border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] border-collapse">
          <thead className="app-table-head">
            <tr className="text-left">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Date
              </th>
              {showAssignee ? (
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Assignee
                </th>
              ) : null}
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Schedule
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Breaks
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Grace
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Source
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm text-foreground">
            {assignments.map((assignment) => {
              const assignee = assigneeLabel(assignment);

              return (
                <tr key={assignment.id} className="app-row-hover align-top">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-semibold">{formatDateLabel(assignment.work_date)}</p>
                      {assignment.is_overnight ? (
                        <Badge variant="warning" className="w-fit">
                          Overnight
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  {showAssignee ? (
                    <td className="px-4 py-3 font-medium">{assignee}</td>
                  ) : null}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="font-medium">{scheduleLabel(assignment)}</p>
                      {assignment.is_rest_day ? (
                        <Badge variant="neutral" className="w-fit">
                          No shift
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {renderBreakSummary(assignment)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {assignment.grace_minutes} min
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{sourceLabel(assignment.source)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {assignment.notes ?? "No notes"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplateFormFields({
  form,
  onChange,
}: {
  form: TemplateFormState;
  onChange: (value: React.SetStateAction<TemplateFormState>) => void;
}) {
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="template-name">Template name</Label>
        <Input
          id="template-name"
          value={form.name}
          onChange={(event) =>
            onChange((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="Morning shift"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-start-time">Start time</Label>
        <Input
          id="template-start-time"
          type="time"
          value={form.startTime}
          onChange={(event) =>
            onChange((current) => ({ ...current, startTime: event.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-end-time">End time</Label>
        <Input
          id="template-end-time"
          type="time"
          value={form.endTime}
          onChange={(event) =>
            onChange((current) => ({ ...current, endTime: event.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-grace-minutes">Grace minutes</Label>
        <Input
          id="template-grace-minutes"
          type="number"
          min={0}
          value={form.graceMinutes}
          onChange={(event) =>
            onChange((current) => ({ ...current, graceMinutes: event.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-break-minutes">Break minutes</Label>
        <Input
          id="template-break-minutes"
          type="number"
          min={0}
          value={form.breakMinutes}
          onChange={(event) =>
            onChange((current) => ({ ...current, breakMinutes: event.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-second-break-minutes">Second break minutes</Label>
        <Input
          id="template-second-break-minutes"
          type="number"
          min={0}
          value={form.secondBreakMinutes}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              secondBreakMinutes: event.target.value,
            }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-status">Status</Label>
        <Select
          value={form.isActive ? "active" : "inactive"}
          onValueChange={(value) =>
            onChange((current) => ({ ...current, isActive: value === "active" }))
          }
        >
          <SelectTrigger id="template-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <label className="app-surface-subtle flex items-center gap-3 rounded-xl border px-4 py-3 sm:col-span-2">
        <input
          type="checkbox"
          checked={form.isOvernight}
          onChange={(event) =>
            onChange((current) => ({ ...current, isOvernight: event.target.checked }))
          }
          className="size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Overnight shift</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Enable this when the shift ends on the following calendar day.
          </p>
        </div>
      </label>
    </>
  );
}

export default function SchedulesClient({
  isAdmin,
  range,
  templates,
  assignees,
  employeeAssignments,
  companyAssignments,
  companySchedulePage,
  companySchedulePageSize,
  companyScheduleHasNextPage,
  companyScheduleHasPreviousPage,
}: SchedulesClientProps) {
  const router = useRouter();
  const [isCreatingTemplate, startCreateTemplate] = React.useTransition();
  const [isUpdatingTemplate, startUpdateTemplate] = React.useTransition();
  const [isAssigningSchedules, startAssignSchedules] = React.useTransition();
  const [createTemplateForm, setCreateTemplateForm] = React.useState<TemplateFormState>(
    () => createEmptyTemplateFormState()
  );
  const [editingTemplateId, setEditingTemplateId] = React.useState<string | null>(null);
  const [editTemplateForm, setEditTemplateForm] = React.useState<TemplateFormState | null>(null);
  const [assignmentForm, setAssignmentForm] = React.useState<AssignmentFormState>(() =>
    createAssignmentFormState(range, templates)
  );

  const assignments = isAdmin ? companyAssignments : employeeAssignments;
  const activeTemplates = templates.filter((template) => template.is_active);
  const selectedAssigneeCount = assignmentForm.employeeIds.length;
  const rangeDayCount = countDaysInRange({
    from: assignmentForm.startDate,
    to: assignmentForm.endDate,
  });
  const companySchedulePageStart = (companySchedulePage - 1) * companySchedulePageSize + 1;
  const companySchedulePageEnd = companySchedulePageStart + companyAssignments.length - 1;

  function updateEditTemplateForm(value: React.SetStateAction<TemplateFormState>) {
    setEditTemplateForm((current) => {
      if (!current) {
        return current;
      }

      return typeof value === "function"
        ? (value as (current: TemplateFormState) => TemplateFormState)(current)
        : value;
    });
  }

  function buildCompanySchedulePageHref(page: number) {
    const params = new URLSearchParams();
    params.set("from", range.from);
    params.set("to", range.to);
    params.set("companyPage", String(page));
    return `/dashboard/schedules?${params.toString()}`;
  }

  React.useEffect(() => {
    if (assignmentForm.templateId || assignmentForm.isRestDay || activeTemplates.length === 0) {
      return;
    }

    setAssignmentForm((current) => ({
      ...current,
      templateId: activeTemplates[0]?.id ?? "",
    }));
  }, [activeTemplates, assignmentForm.isRestDay, assignmentForm.templateId]);

  function handleCreateTemplateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startCreateTemplate(async () => {
      const result = await createShiftTemplateAction({
        name: createTemplateForm.name,
        startTime: createTemplateForm.startTime,
        endTime: createTemplateForm.endTime,
        graceMinutes: createTemplateForm.graceMinutes,
        breakMinutes: createTemplateForm.breakMinutes,
        secondBreakMinutes: createTemplateForm.secondBreakMinutes,
        isOvernight: createTemplateForm.isOvernight,
        isActive: createTemplateForm.isActive,
      });

      if (!result.ok) {
        toast.error(result.error ?? "Unable to create shift template.");
        return;
      }

      setCreateTemplateForm(createEmptyTemplateFormState());
      toast.success("Shift template created.");
      router.refresh();
    });
  }

  function beginEditingTemplate(template: ShiftTemplate) {
    setEditingTemplateId(template.id);
    setEditTemplateForm(createTemplateFormState(template));
  }

  function handleUpdateTemplateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingTemplateId || !editTemplateForm) {
      toast.error("Choose a shift template to edit first.");
      return;
    }

    startUpdateTemplate(async () => {
      const result = await updateShiftTemplateAction({
        templateId: editingTemplateId,
        name: editTemplateForm.name,
        startTime: editTemplateForm.startTime,
        endTime: editTemplateForm.endTime,
        graceMinutes: editTemplateForm.graceMinutes,
        breakMinutes: editTemplateForm.breakMinutes,
        secondBreakMinutes: editTemplateForm.secondBreakMinutes,
        isOvernight: editTemplateForm.isOvernight,
        isActive: editTemplateForm.isActive,
      });

      if (!result.ok) {
        toast.error(result.error ?? "Unable to update shift template.");
        return;
      }

      setEditingTemplateId(null);
      setEditTemplateForm(null);
      toast.success("Shift template updated.");
      router.refresh();
    });
  }

  function toggleAssigneeSelection(assigneeId: string) {
    setAssignmentForm((current) => {
      const isSelected = current.employeeIds.includes(assigneeId);

      return {
        ...current,
        employeeIds: isSelected
          ? current.employeeIds.filter((value) => value !== assigneeId)
          : [...current.employeeIds, assigneeId],
      };
    });
  }

  function handleAssignSchedulesSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startAssignSchedules(async () => {
      const result = await assignSchedulesAction({
        employeeIds: assignmentForm.employeeIds,
        templateId: assignmentForm.isRestDay ? null : assignmentForm.templateId || null,
        startDate: assignmentForm.startDate,
        endDate: assignmentForm.endDate,
        isRestDay: assignmentForm.isRestDay,
        notes: assignmentForm.notes,
      });

      if (!result.ok) {
        toast.error(result.error ?? "Unable to save schedules.");
        return;
      }

      setAssignmentForm((current) => ({
        ...current,
        notes: "",
      }));

      toast.success(
        result.assignmentCount === 1
          ? "1 schedule row saved."
          : `${result.assignmentCount ?? 0} schedule rows saved.`
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Shift scheduling"
        title={isAdmin ? "Schedules and templates" : "My schedule"}
        description={
          isAdmin
            ? "Create reusable shifts, assign schedules by day or date range, and review the company schedule without recurring logic."
            : "Review your assigned schedules for the selected date range."
        }
      />

      <Card>
        <CardHeader className="border-b border-[color:var(--surface-border-strong)]">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-4 text-muted-foreground" />
            <CardTitle>Date range</CardTitle>
          </div>
          <CardDescription>
            Filter the schedule view by a simple inclusive date range.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form method="get" className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="schedule-range-from">From</Label>
              <Input id="schedule-range-from" name="from" type="date" defaultValue={range.from} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-range-to">To</Label>
              <Input id="schedule-range-to" name="to" type="date" defaultValue={range.to} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto">
                Apply range
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{countDaysInRange(range)} days loaded</Badge>
            {isAdmin ? (
              <Badge variant="outline">{companyAssignments.length} rows on this page</Badge>
            ) : (
              <Badge variant="outline">{employeeAssignments.length} personal assignments</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {isAdmin ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <Card className="min-w-0">
            <CardHeader className="border-b border-[color:var(--surface-border-strong)]">
              <div className="flex items-center gap-2">
                <Clock3 className="size-4 text-muted-foreground" />
                <CardTitle>Shift templates</CardTitle>
              </div>
              <CardDescription>
                Create reusable daily shifts. Existing assignments keep their copied values even if a
                template changes later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <form onSubmit={handleCreateTemplateSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TemplateFormFields form={createTemplateForm} onChange={setCreateTemplateForm} />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isCreatingTemplate}>
                    <Plus className="size-4" />
                    {isCreatingTemplate ? "Saving..." : "Create template"}
                  </Button>
                </div>
              </form>

              {editTemplateForm && editingTemplateId ? (
                <div className="app-surface-subtle rounded-[20px] border p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Editing template</p>
                      <p className="text-sm text-muted-foreground">
                        Update the template without changing existing assignment snapshots.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingTemplateId(null);
                        setEditTemplateForm(null);
                      }}
                    >
                      Close
                    </Button>
                  </div>

                  <form onSubmit={handleUpdateTemplateSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TemplateFormFields form={editTemplateForm} onChange={updateEditTemplateForm} />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isUpdatingTemplate}>
                        {isUpdatingTemplate ? "Updating..." : "Update template"}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : null}

              {templates.length === 0 ? (
                <div className="app-surface-subtle rounded-[20px] border border-dashed px-6 py-10 text-center">
                  <p className="text-base font-semibold text-foreground">No shift templates yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Create your first template above to start assigning schedules.
                  </p>
                </div>
              ) : (
                <div className="app-surface-strong overflow-hidden rounded-[20px] border">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse">
                      <thead className="app-table-head">
                        <tr className="text-left">
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Name
                          </th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Shift
                          </th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Breaks
                          </th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Status
                          </th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-sm text-foreground">
                        {templates.map((template) => (
                          <tr key={template.id} className="app-row-hover">
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="font-semibold">{template.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Grace: {template.grace_minutes} min
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {formatTimeLabel(template.start_time)} to{" "}
                                  {formatTimeLabel(template.end_time)}
                                </p>
                                {template.is_overnight ? (
                                  <Badge variant="warning" className="w-fit">
                                    Overnight
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {template.break_minutes} + {template.second_break_minutes} min
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={template.is_active ? "success" : "neutral"}>
                                {template.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => beginEditingTemplate(template)}
                              >
                                <PencilLine className="size-4" />
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader className="border-b border-[color:var(--surface-border-strong)]">
              <div className="flex items-center gap-2">
                <UsersRound className="size-4 text-muted-foreground" />
                <CardTitle>Assign schedules</CardTitle>
              </div>
              <CardDescription>
                Select one or more company members, choose one day or a date range, then save with upsert
                overwrite behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAssignSchedulesSubmit} className="space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Label>Assignees</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAssignmentForm((current) => ({
                            ...current,
                            employeeIds: assignees.map((assignee) => assignee.id),
                          }))
                        }
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setAssignmentForm((current) => ({
                            ...current,
                            employeeIds: [],
                          }))
                        }
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {assignees.length === 0 ? (
                    <div className="app-surface-subtle rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      No eligible company members are available for scheduling yet.
                    </div>
                  ) : (
                    <div className="app-surface-subtle max-h-72 space-y-2 overflow-y-auto rounded-[20px] border p-3">
                      {assignees.map((assignee) => {
                        const checked = assignmentForm.employeeIds.includes(assignee.id);

                        return (
                          <label
                            key={assignee.id}
                            className="flex items-center gap-3 rounded-xl border bg-[var(--surface-panel-strong)] px-3 py-3"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAssigneeSelection(assignee.id)}
                              className="size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {assignee.display_name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {assignee.email ?? "Company member profile"} |{" "}
                                {(assignee.role ?? "member").replace(/^\w/, (value) => value.toUpperCase())}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <label className="app-surface-subtle flex items-center gap-3 rounded-xl border px-4 py-3">
                  <input
                    type="checkbox"
                    checked={assignmentForm.isRestDay}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        isRestDay: event.target.checked,
                      }))
                    }
                    className="size-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Assign as rest day</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Rest day rows skip shift times and store zero break and grace values.
                    </p>
                  </div>
                </label>

                <div className="space-y-2">
                  <Label htmlFor="assignment-template">Shift template</Label>
                  <Select
                    value={assignmentForm.templateId}
                    onValueChange={(value) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        templateId: value,
                      }))
                    }
                    disabled={assignmentForm.isRestDay || activeTemplates.length === 0}
                  >
                    <SelectTrigger id="assignment-template">
                      <SelectValue
                        placeholder={
                          activeTemplates.length === 0
                            ? "No active templates available"
                            : "Select a template"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {activeTemplates.length === 0 ? (
                        <SelectItem value="__no_active_template__" disabled>
                          No active templates available
                        </SelectItem>
                      ) : (
                        activeTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="assignment-start-date">Start date</Label>
                    <Input
                      id="assignment-start-date"
                      type="date"
                      value={assignmentForm.startDate}
                      onChange={(event) =>
                        setAssignmentForm((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignment-end-date">End date</Label>
                    <Input
                      id="assignment-end-date"
                      type="date"
                      value={assignmentForm.endDate}
                      onChange={(event) =>
                        setAssignmentForm((current) => ({
                          ...current,
                          endDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assignment-notes">Notes</Label>
                  <Textarea
                    id="assignment-notes"
                    value={assignmentForm.notes}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="Optional schedule note"
                  />
                </div>

                <div className="app-surface-subtle flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3">
                  <Badge variant="outline">{selectedAssigneeCount} assignees</Badge>
                  <Badge variant="outline">{rangeDayCount} days</Badge>
                  <Badge variant="outline">
                    {selectedAssigneeCount * rangeDayCount} rows to upsert
                  </Badge>
                  {assignmentForm.isRestDay ? (
                    <Badge variant="neutral">Rest day assignment</Badge>
                  ) : null}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      isAssigningSchedules ||
                      assignees.length === 0 ||
                      (!assignmentForm.isRestDay && activeTemplates.length === 0)
                    }
                  >
                    {isAssigningSchedules ? "Saving..." : "Save assignments"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b border-[color:var(--surface-border-strong)]">
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <UsersRound className="size-4 text-muted-foreground" />
            ) : (
              <MoonStar className="size-4 text-muted-foreground" />
            )}
            <CardTitle>{isAdmin ? "Company schedule" : "Assigned schedule"}</CardTitle>
          </div>
          <CardDescription>
            {isAdmin
              ? "Daily assignment rows for the selected company range."
              : "Only confirmed assignment rows are listed. Dates with no schedule stay empty."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <AssignmentRows assignments={assignments} showAssignee={isAdmin} />

          {isAdmin &&
          (companyAssignments.length > 0 ||
            companyScheduleHasPreviousPage ||
            companyScheduleHasNextPage) ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {companyAssignments.length > 0
                  ? `Showing ${companySchedulePageStart}-${companySchedulePageEnd} with a maximum of ${companySchedulePageSize} rows per page`
                  : `No rows on page ${companySchedulePage}.`}
              </p>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">Page {companySchedulePage}</Badge>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className={!companyScheduleHasPreviousPage ? "pointer-events-none opacity-50" : undefined}
                >
                  <Link
                    href={buildCompanySchedulePageHref(Math.max(companySchedulePage - 1, 1))}
                    aria-disabled={!companyScheduleHasPreviousPage}
                    tabIndex={companyScheduleHasPreviousPage ? 0 : -1}
                  >
                    Previous
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className={!companyScheduleHasNextPage ? "pointer-events-none opacity-50" : undefined}
                >
                  <Link
                    href={buildCompanySchedulePageHref(companySchedulePage + 1)}
                    aria-disabled={!companyScheduleHasNextPage}
                    tabIndex={companyScheduleHasNextPage ? 0 : -1}
                  >
                    Next
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
