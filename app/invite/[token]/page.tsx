import AuthShell from "@/components/auth-shell";
import AcceptInviteForm from "@/components/AcceptInviteForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { hashInviteToken } from "@/lib/invitations/server";
import { createAdminClient } from "@/lib/supabase/admin";

type InvitePageParams = {
  params: Promise<{
    token: string;
  }>;
};

type InviteLookupRow = {
  email: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  companies:
    | {
        name: string;
      }
    | Array<{
        name: string;
      }>
    | null;
};

function resolveCompanyName(
  companies:
    | {
        name: string;
      }
    | Array<{
        name: string;
      }>
    | null
) {
  const company = Array.isArray(companies) ? companies[0] : companies;
  return company?.name ?? "your company";
}

export default async function InvitePage({ params }: InvitePageParams) {
  const { token } = await params;

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (error: unknown) {
    return (
      <AuthShell
        title="Invite unavailable"
        description="Invite acceptance is not configured correctly."
      >
        <Alert variant="destructive">
          <AlertTitle>Configuration error</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Missing Supabase admin configuration."}
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  const tokenHash = hashInviteToken(token);

  const { data, error } = await adminClient
    .from("invitations")
    .select("email, status, expires_at, companies ( name )")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) {
    return (
      <AuthShell
        title="Invalid invite"
        description="This invitation link is invalid or no longer available."
      >
        <Alert variant="destructive">
          <AlertTitle>Invite not found</AlertTitle>
          <AlertDescription>
            Ask your company admin to send a new invite link.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  const invite = data as InviteLookupRow;

  if (invite.status === "revoked") {
    return (
      <AuthShell title="Invite revoked" description="This invitation has been revoked.">
        <Alert variant="destructive">
          <AlertTitle>Revoked invitation</AlertTitle>
          <AlertDescription>
            Contact your admin if you still need access.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  if (invite.status === "accepted") {
    return (
      <AuthShell title="Invite already used" description="This invite has already been accepted.">
        <Alert>
          <AlertTitle>Already accepted</AlertTitle>
          <AlertDescription>
            Sign in with your existing account credentials.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  if (invite.status === "expired") {
    return (
      <AuthShell title="Invite expired" description="This invitation is no longer valid.">
        <Alert variant="destructive">
          <AlertTitle>Expired invitation</AlertTitle>
          <AlertDescription>
            Ask your admin to issue a new invite.
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Accept invitation"
      description="Complete your details to join your company workspace."
    >
      <AcceptInviteForm
        token={token}
        email={invite.email}
        companyName={resolveCompanyName(invite.companies)}
        expiresAt={invite.expires_at}
      />
    </AuthShell>
  );
}
