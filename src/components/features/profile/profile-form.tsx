"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, Loader2, Eye, EyeOff, Shield, Mail, Calendar, KeyRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { assetUrl } from "@/lib/r2-url";
import {
  getProfile,
  updateUsername,
  changePassword,
  uploadAvatar,
  removeAvatar,
} from "@/lib/actions/profile";
import { format } from "date-fns";

function formatDate(dateStr: string): string {
  try {
    const date = dateStr.endsWith("Z") ? new Date(dateStr) : new Date(dateStr + "Z");
    return format(date, "MMM d, yyyy");
  } catch {
    return "";
  }
}

interface ProfileData {
  userId: number;
  username: string;
  email: string;
  avatarUrl: string | null;
  roleName: string | null;
  createdAt: string;
}

export function ProfileForm() {
  const { update: updateSession } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Username state
  const [username, setUsername] = useState("");
  const [usernameMessage, setUsernameMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingUsername, startUsernameTransition] = useTransition();

  // Password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSavingPassword, startPasswordTransition] = useTransition();

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [isUploadingAvatar, startAvatarTransition] = useTransition();

  // Fetch profile on mount
  useEffect(() => {
    getProfile().then((data) => {
      setProfile(data);
      setUsername(data.username);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = profile.username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const avatarSrc = assetUrl(profile.avatarUrl);

  function handleAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    // Show preview in confirmation dialog
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
      setPendingAvatarFile(file);
      setAvatarDialogOpen(true);
    };
    reader.readAsDataURL(file);
  }

  function handleAvatarConfirm() {
    if (!pendingAvatarFile) return;

    const formData = new FormData();
    formData.append("avatar", pendingAvatarFile);

    startAvatarTransition(async () => {
      const result = await uploadAvatar(formData);
      setAvatarDialogOpen(false);
      setPendingAvatarFile(null);
      if (result.success && result.key) {
        setProfile((p) => p ? { ...p, avatarUrl: result.key! } : p);
        setAvatarPreview(null);
        await updateSession();
        router.refresh();
      } else {
        setAvatarPreview(null);
        alert(result.error ?? "Failed to upload avatar");
      }
    });
  }

  function handleAvatarDialogClose() {
    setAvatarDialogOpen(false);
    setAvatarPreview(null);
    setPendingAvatarFile(null);
  }

  function handleRemoveAvatar() {
    startAvatarTransition(async () => {
      const result = await removeAvatar();
      setRemoveDialogOpen(false);
      if (result.success) {
        setProfile((p) => p ? { ...p, avatarUrl: null } : p);
        setAvatarPreview(null);
        await updateSession();
        router.refresh();
      }
    });
  }

  function handleSaveUsername() {
    setUsernameMessage(null);
    if (username.trim() === profile?.username) return;

    startUsernameTransition(async () => {
      const result = await updateUsername(username);
      if (result.success) {
        setProfile((p) => p ? { ...p, username: username.trim() } : p);
        setUsernameMessage({ type: "success", text: "Username updated" });
        await updateSession();
        router.refresh();
      } else {
        setUsernameMessage({ type: "error", text: result.error ?? "Failed to update" });
      }
    });
  }

  function handleChangePassword() {
    setPasswordMessage(null);

    if (!currentPassword || !newPassword) {
      setPasswordMessage({ type: "error", text: "Both passwords are required" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    startPasswordTransition(async () => {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        setPasswordDialogOpen(false);
        resetPasswordForm();
      } else {
        setPasswordMessage({ type: "error", text: result.error ?? "Failed to change password" });
      }
    });
  }

  function resetPasswordForm() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setPasswordMessage(null);
  }

  return (
    <>
      {/* Avatar & Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your photo and personal info</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="size-20">
                <AvatarImage src={avatarSrc ?? undefined} alt={profile.username} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  <Camera className="size-4 mr-1.5" />
                  Change photo
                </Button>
                {profile.avatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveDialogOpen(true)}
                    disabled={isUploadingAvatar}
                  >
                    <Trash2 className="size-4 mr-1.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP or GIF.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarSelected}
            />
          </div>

          {/* Avatar confirmation dialog */}
          <Dialog open={avatarDialogOpen} onOpenChange={(open) => { if (!open) handleAvatarDialogClose(); }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Change profile photo</DialogTitle>
                <DialogDescription>Do you want to use this photo?</DialogDescription>
              </DialogHeader>
              {avatarPreview && (
                <div className="flex justify-center py-4">
                  <Avatar className="size-32">
                    <AvatarImage src={avatarPreview} alt="Preview" />
                    <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
                  </Avatar>
                </div>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAvatarConfirm} disabled={isUploadingAvatar}>
                  {isUploadingAvatar && <Loader2 className="size-4 animate-spin mr-1.5" />}
                  Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Remove avatar confirmation */}
          <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your profile photo will be removed and replaced with your initials.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveAvatar} disabled={isUploadingAvatar}>
                  {isUploadingAvatar && <Loader2 className="size-4 animate-spin mr-1.5" />}
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Separator />

          {/* Read-only info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">
                <Mail className="size-3.5" />
                Email
              </Label>
              <p className="text-sm px-3 py-2 bg-muted/50 rounded-4xl">{profile.email}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">
                <Shield className="size-3.5" />
                Role
              </Label>
              <p className="text-sm px-3 py-2 bg-muted/50 rounded-4xl">{profile.roleName ?? "No role"}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">
                <Calendar className="size-3.5" />
                Joined
              </Label>
              <p className="text-sm px-3 py-2 bg-muted/50 rounded-4xl">{formatDate(profile.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Username Card */}
      <Card>
        <CardHeader>
          <CardTitle>Username</CardTitle>
          <CardDescription>This is your display name across the admin portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameMessage(null);
              }}
              placeholder="Your username"
            />
          </div>
          {usernameMessage && (
            <p className={`text-sm ${usernameMessage.type === "success" ? "text-emerald-500" : "text-destructive"}`}>
              {usernameMessage.text}
            </p>
          )}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveUsername}
              disabled={isSavingUsername || username.trim() === profile.username}
            >
              {isSavingUsername && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <KeyRound className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-xs text-muted-foreground">Change your account password</p>
              </div>
            </div>
            <Dialog open={passwordDialogOpen} onOpenChange={(open) => { setPasswordDialogOpen(open); if (!open) resetPasswordForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Change password</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change password</DialogTitle>
                  <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password">Current password</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setPasswordMessage(null); }}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New password</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPasswordMessage(null); }}
                        placeholder="Min 8 characters"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPasswordMessage(null); }}
                      placeholder="Confirm new password"
                    />
                  </div>
                  {passwordMessage && (
                    <p className={`text-sm ${passwordMessage.type === "error" ? "text-destructive" : "text-emerald-500"}`}>
                      {passwordMessage.text}
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleChangePassword}
                    disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {isSavingPassword && <Loader2 className="size-4 animate-spin mr-1.5" />}
                    Change password
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
