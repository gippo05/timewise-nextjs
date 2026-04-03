"use client";

import * as React from "react";
import { Copy, MailPlus, ShieldAlert, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";

import {
  createInviteAction,
  revokeInviteAction,
} from "@/app/dashboard/settings/invitation-actions";
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
import type { InvitationListItem, InvitationStatus } from "@/src/types/invitation";

type Props = {
  canManage: boolean;
  initialInvites: InvitationListItem[];
};

function statusVariant(status: InvitationStatus) {
  switch (status) {
    case "accepted":
      return "success" as const;
    case "revoked":
      return "danger" as const;
    case "expired":
      return "warning" as const;
    case "pending":
    default:
      return "outline" as const;
  }
}

function statusLabel(status: InvitationStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function TeamInvitationsSection({ canManage, initialInvites }: Props) {
  const [invites, setInvites] = React.useState<InvitationListItem[]>(initialInvites);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [inviteLink, setInviteLink] = React.useState<string | null>(null);
  const [isSubmitting, startSubmitting] = React.useTransition();
  const [isRevokingId, setIsRevokingId] = React.useState<string | null>(null);

  function handleCreateInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteLink(null);

    startSubmitting(async () => {
      const result = await createInviteAction({ email });
      if (!result.ok || !result.invitation) {
        toast.error(result.error ?? "Unable to create invite.");
        return;
      }

      setInvites((current) => [
        result.invitation!,
        ...current.filter((item) => item.id !== result.invitation!.id),
      ]);

      setInviteLink(result.inviteUrl ?? null);
      setEmail("");
      toast.success("Employee invite created.");
    });
  }

  function handleRevoke(invitationId: string) {
    setIsRevokingId(invitationId);

    void (async () => {
      const result = await revokeInviteAction({ invitationId });
      if (!result.ok) {
        toast.error(result.error ?? "Unable to revoke invite.");
        setIsRevokingId(null);
        return;
      }

      setInvites((current) =>
        current.map((item) =>
          item.id === invitationId ? { ...item, status: "revoked" } : item
        )
      );
      setIsRevokingId(null);
      toast.success("Invitation revoked.");
    })();
  }

  async function copyInviteLink() {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Unable to copy link.");
    }
  }

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-muted-foreground" />
            <CardTitle>Team / Invitations</CardTitle>
          </div>
          <CardDescription>
            Only admins can invite employees to this company workspace.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4 border-b border-[color:var(--surface-border-strong)] pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UsersRound className="size-4 text-muted-foreground" />
              <CardTitle>Team / Invitations</CardTitle>
            </div>
            <CardDescription>
              Invite employees to your company. Invitations expire in 7 days.
            </CardDescription>
          </div>

          <Button type="button" onClick={() => setIsModalOpen(true)}>
            <MailPlus className="size-4" />
            Invite Employee
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {invites.length === 0 ? (
          <div className="app-surface-subtle rounded-[20px] border border-dashed px-6 py-10 text-center">
            <p className="text-base font-semibold text-foreground">No invites yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first employee invitation from Settings.
            </p>
          </div>
        ) : (
          <div className="app-surface-strong overflow-hidden rounded-[20px] border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="app-table-head">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Invited at
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Expires at
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm text-foreground">
                  {invites.map((invite) => {
                    const isPending = invite.status === "pending";
                    const isRevoking = isRevokingId === invite.id;

                    return (
                      <tr key={invite.id} className="app-row-hover">
                        <td className="px-4 py-3 font-medium">{invite.email}</td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant(invite.status)}>
                            {statusLabel(invite.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(invite.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(invite.expires_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevoke(invite.id)}
                            disabled={!isPending || isRevoking}
                          >
                            <Trash2 className="size-4" />
                            {isRevoking ? "Revoking..." : "Revoke"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="app-surface-strong w-full max-w-md rounded-[24px] border p-6 shadow-[var(--shadow-medium)]">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Invite employee
              </h3>
              <p className="text-sm text-muted-foreground">
                Enter an employee email. Role is always employee.
              </p>
            </div>

            <form onSubmit={handleCreateInvite} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Employee email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="employee@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoFocus
                  required
                />
              </div>

              {inviteLink ? (
                <div className="app-surface-subtle rounded-xl border px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Invite link
                  </p>
                  <p className="mt-1 break-all text-sm text-foreground">{inviteLink}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={copyInviteLink}
                  >
                    <Copy className="size-4" />
                    Copy link
                  </Button>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEmail("");
                    setInviteLink(null);
                  }}
                >
                  Close
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Create invite"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
