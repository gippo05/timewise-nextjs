"use client";

import * as React from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileRow = {
  id: string;
  avatar_path: string | null;
  first_name?: string | null;
};

type Props = {
  userId: string; // supabase auth uid
  // Optional: for nicer fallback letters
  fallbackName?: string; // e.g. "Gipps"
  // Optional: force file extension
  preferredExt?: "png" | "jpg" | "jpeg" | "webp";
};

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export default function AvatarUploaderCard({ userId, fallbackName, preferredExt = "png" }: Props) {
  const supabase = createClient();

  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  const [uploading, setUploading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [fileInputKey, setFileInputKey] = React.useState(0);

  const canRemove = Boolean(profile?.avatar_path);

  const loadProfile = React.useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, avatar_path")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(error);
      toast.error("Failed to load profile.");
      return;
    }

    const row = (data as ProfileRow | null) ?? { id: userId, avatar_path: null, full_name: null };
    setProfile(row);

    if (row.avatar_path) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(row.avatar_path);
      // cache-bust to show freshly uploaded file even if CDN caches it
      setAvatarUrl(`${urlData.publicUrl}?v=${Date.now()}`);
    } else {
      setAvatarUrl(null);
    }
  }, [supabase, userId]);

  React.useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleUpload(file: File) {
    // Guardrails: because users will try uploading the entire internet.
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
        (extFromName === "png" || extFromName === "jpg" || extFromName === "jpeg" || extFromName === "webp"
          ? (extFromName as any)
          : "png");

      // IMPORTANT: matches your storage policy (foldername == userId)
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true, // requires UPDATE policy too
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      // Save the path in profiles
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({ id: userId, avatar_path: path }, { onConflict: "id" });

      if (upsertError) throw upsertError;

      toast.success("Avatar updated.");
      await loadProfile();
      setFileInputKey((k) => k + 1); // reset input so same file can be picked again
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!profile?.avatar_path) return;

    setRemoving(true);
    try {
      // Delete from storage
      const { error: removeError } = await supabase.storage.from("avatars").remove([profile.avatar_path]);
      if (removeError) throw removeError;

      // Clear from profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_path: null })
        .eq("id", userId);

      if (updateError) throw updateError;

      toast.success("Avatar removed.");
      await loadProfile();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Failed to remove avatar.");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card className="rounded-2xl border-black/10 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base sm:text-lg font-semibold tracking-tight">Profile Avatar</CardTitle>
        <CardDescription>Upload a square image for best results. Max 2MB.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 ring-1 ring-black/10">
            {/* AvatarImage is fine, but Next/Image handles caching better.
                We keep AvatarImage for shadcn consistency. */}
            <AvatarImage src={avatarUrl ?? undefined} alt="Profile avatar" />
            <AvatarFallback className="text-sm">
              {initials(profile?.first_name ?? fallbackName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="text-sm font-medium leading-none">
              {profile?.first_name || fallbackName || "User"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{userId}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar">Upload new avatar</Label>
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
          <p className="text-xs text-muted-foreground">
            Tip: If your new avatar doesn’t show immediately, that’s caching. The code already cache-busts, so it
            should behave.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            disabled={!canRemove || uploading || removing}
            onClick={() => void handleRemove()}
            className="rounded-xl"
          >
            {removing ? "Removing..." : "Remove avatar"}
          </Button>

          <Button
            variant="secondary"
            disabled={uploading || removing}
            onClick={() => void loadProfile()}
            className="rounded-xl"
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
