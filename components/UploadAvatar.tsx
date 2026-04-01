"use client";

import * as React from "react";
import { RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileRow = {
  id: string;
  avatar_path: string | null;
  first_name: string | null;
  last_name: string | null;
};

type Props = {
  userId: string;
  fallbackName?: string;
  preferredExt?: "png" | "jpg" | "jpeg" | "webp";
};

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export default function AvatarUploaderCard({
  userId,
  fallbackName,
  preferredExt = "png",
}: Props) {
  const supabase = createClient();

  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [fileInputKey, setFileInputKey] = React.useState(0);

  const canRemove = Boolean(profile?.avatar_path);
  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() ||
    fallbackName ||
    "Team member";

  const loadProfile = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, avatar_path, first_name, last_name")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      toast.error("Failed to load profile.");
      return;
    }

    const row = (data as ProfileRow | null) ?? {
      id: userId,
      avatar_path: null,
      first_name: null,
      last_name: null,
    };
    setProfile(row);

    if (row.avatar_path) {
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(row.avatar_path);
      setAvatarUrl(`${urlData.publicUrl}?v=${Date.now()}`);
    } else {
      setAvatarUrl(null);
    }
  }, [supabase, userId]);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Max file size is 2MB.");
      return;
    }

    setUploading(true);
    try {
      const extFromName = file.name.split(".").pop()?.toLowerCase();
      const ext =
        preferredExt ||
        (extFromName === "png" ||
        extFromName === "jpg" ||
        extFromName === "jpeg" ||
        extFromName === "webp"
          ? extFromName
          : "png");

      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

      if (uploadError) throw uploadError;

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({ id: userId, avatar_path: path }, { onConflict: "id" });

      if (upsertError) throw upsertError;

      toast.success("Avatar updated.");
      await loadProfile();
      setFileInputKey((key) => key + 1);
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error) || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!profile?.avatar_path) return;

    setRemoving(true);
    try {
      const { error: removeError } = await supabase.storage
        .from("avatars")
        .remove([profile.avatar_path]);
      if (removeError) throw removeError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_path: null })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast.success("Avatar removed.");
      await loadProfile();
    } catch (error: unknown) {
      console.error(error);
      toast.error(getErrorMessage(error) || "Failed to remove avatar.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Profile avatar</CardTitle>
        <CardDescription>
          Upload a square image for the cleanest result. Maximum file size: 2MB.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="app-surface-subtle rounded-[24px] border px-4 py-5">
          <div className="flex items-center gap-4">
            <Avatar className="app-icon-surface size-20 border">
              <AvatarImage src={avatarUrl ?? undefined} alt="Profile avatar" />
              <AvatarFallback className="text-lg font-semibold text-foreground">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 space-y-1">
              <p className="truncate text-lg font-semibold tracking-tight text-foreground">
                {displayName}
              </p>
              <p className="truncate text-sm text-muted-foreground">{userId}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar">Upload a new avatar</Label>
          <Input
            key={fileInputKey}
            id="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            disabled={uploading || removing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Refresh is available if you want to verify the latest file state after an upload.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            disabled={uploading || removing}
            onClick={() => void loadProfile()}
          >
            <RefreshCcw className="size-4" />
            Refresh
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={!canRemove || uploading || removing}
            onClick={() => void handleRemove()}
          >
            <Trash2 className="size-4" />
            {removing ? "Removing..." : "Remove"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
