export type InvitationRole = "employee";

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type InvitationListItem = {
  id: string;
  company_id: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};
