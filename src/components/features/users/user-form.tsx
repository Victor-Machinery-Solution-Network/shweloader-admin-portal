"use client";

import { useState, useTransition, useMemo } from "react";
import { UserPlus, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { RequiredInput } from "@/components/ui/required-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel, FieldContent } from "@/components/ui/field";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxCollection,
} from "@/components/ui/combobox";
import { FormDialog } from "@/components/shared/form-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createAppUser } from "@/lib/actions/app-user";
import type { BusinessType } from "@/types/app-user";

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessTypes: BusinessType[];
}

export function UserForm({
  open,
  onOpenChange,
  businessTypes,
}: UserFormProps) {
  const [isPending, startTransition] = useTransition();

  // Business type combobox state
  const btIdByName = useMemo(
    () => new Map(businessTypes.map((bt) => [bt.name, bt.business_type_id])),
    [businessTypes],
  );
  const OTHER_OPTION = "Other";
  const btNames = useMemo(
    () => [...businessTypes.map((bt) => bt.name), OTHER_OPTION],
    [businessTypes],
  );
  const [selectedBT, setSelectedBT] = useState("");
  const isOther = selectedBT === OTHER_OPTION;
  const [isPartner, setIsPartner] = useState(false);

  // Generated password dialog
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleSubmit(formData: FormData) {
    if (!selectedBT) {
      toast.error("Business type is required");
      return;
    }
    if (isOther) {
      // Custom business type — server action will create it with is_listed = 0
      const otherName = formData.get("business_type_other") as string;
      if (!otherName?.trim()) {
        toast.error("Please specify the business type");
        return;
      }
    } else {
      const btId = btIdByName.get(selectedBT);
      if (btId) formData.set("business_type_id", String(btId));
    }
    formData.set("is_approved_partner", isPartner ? "1" : "0");
    startTransition(async () => {
      const result = await createAppUser(formData);

      if (result.success && result.password) {
        toast.success("User created");
        onOpenChange(false);
        setSelectedBT("");
        setIsPartner(false);
        setGeneratedPassword(result.password);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  function handleCopyPassword() {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    toast.success("Password copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={(val) => {
          onOpenChange(val);
          if (!val) {
            setSelectedBT("");
            setIsPartner(false);
          }
        }}
        title="Add User"
        description="Create a new app user account. A password will be auto-generated."
        icon={<UserPlus className="text-primary-foreground size-6" />}
        onSubmit={handleSubmit}
        isPending={isPending}
        submitLabel="Create"
        className="sm:max-w-2xl"
      >
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {/* Row 1: Identity (required) */}
          <Field orientation="vertical">
            <FieldLabel>Username</FieldLabel>
            <FieldContent>
              <RequiredInput
                name="username"
                placeholder="e.g. john_doe"
                errorMessage="Username is required"
                autoComplete="off"
              />
            </FieldContent>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Full Name</FieldLabel>
            <FieldContent>
              <RequiredInput
                name="full_name"
                placeholder="e.g. Aung Kyaw"
                errorMessage="Full name is required"
                autoComplete="off"
              />
            </FieldContent>
          </Field>

          {/* Row 2: Contact (phone required, email optional) */}
          <Field orientation="vertical">
            <FieldLabel>Phone</FieldLabel>
            <FieldContent>
              <RequiredInput
                name="phone"
                placeholder="e.g. 09xxxxxxxxx"
                errorMessage="Phone number is required"
                autoComplete="off"
              />
            </FieldContent>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>
              Email{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <FieldContent>
              <Input
                name="email"
                type="email"
                placeholder="e.g. user@example.com"
                autoComplete="off"
              />
            </FieldContent>
          </Field>

          {/* Row 3: Business type + specify (if Other) */}
          <Field orientation="vertical" className={isOther ? undefined : "sm:col-span-2 sm:max-w-[calc(50%-0.75rem)]"}>
            <FieldLabel>Business Type</FieldLabel>
            <FieldContent>
              <Combobox
                value={selectedBT}
                onValueChange={(val) => setSelectedBT(val ?? "")}
                items={btNames}
              >
                <ComboboxInput
                  placeholder="Select business type..."
                  showClear={!!selectedBT}
                />
                <ComboboxContent>
                  <ComboboxList>
                    <ComboboxEmpty>No business type found</ComboboxEmpty>
                    <ComboboxCollection>
                      {(name) => (
                        <ComboboxItem key={name} value={name}>
                          {name}
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </FieldContent>
          </Field>

          {isOther && (
            <Field orientation="vertical">
              <FieldLabel>Specify Business Type</FieldLabel>
              <FieldContent>
                <Input
                  name="business_type_other"
                  placeholder="e.g. Consulting Firm"
                  autoComplete="off"
                  autoFocus
                />
              </FieldContent>
            </Field>
          )}

          {/* Row 4: Company + Address */}
          <Field orientation="vertical">
            <FieldLabel>
              Company Name{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <FieldContent>
              <Input
                name="company_name"
                placeholder="e.g. ABC Construction Co."
                autoComplete="off"
              />
            </FieldContent>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>
              Address{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <FieldContent>
              <Input
                name="address"
                placeholder="e.g. No. 123, Main Street, Yangon"
                autoComplete="off"
              />
            </FieldContent>
          </Field>

          {/* Partner toggle */}
          <div className="sm:col-span-2 flex items-center justify-between rounded-lg border px-4 py-3">
            <Label htmlFor="partner-switch" className="cursor-pointer">
              <div className="font-medium">Approved Partner</div>
              <p className="text-muted-foreground text-sm font-normal">
                Grant partner status to this user
              </p>
            </Label>
            <Switch
              id="partner-switch"
              checked={isPartner}
              onCheckedChange={setIsPartner}
            />
          </div>
        </div>
      </FormDialog>

      {/* Auto-generated password reveal dialog */}
      <Dialog
        open={!!generatedPassword}
        onOpenChange={(val) => {
          if (!val) {
            setGeneratedPassword(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              Share this password with the user. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="bg-muted flex-1 rounded-lg px-4 py-3 font-mono text-sm select-all">
              {generatedPassword}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyPassword}
              className="shrink-0"
            >
              {copied ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setGeneratedPassword(null);
                setCopied(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
