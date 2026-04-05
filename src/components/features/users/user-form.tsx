"use client";

import { useState, useTransition, useMemo } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { FieldError, RequiredInput } from "@/components/ui/required-input";
import { Input } from "@/components/ui/input";
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
import { createAppUser } from "@/lib/actions/app-user";
import type { BusinessType } from "@/types/app-user";
import type { StateRegion, District, Township } from "@/types/location";

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessTypes: BusinessType[];
  stateRegions: StateRegion[];
  districts: District[];
  townships: Township[];
  onPasswordGenerated: (password: string) => void;
}

export function UserForm({
  open,
  onOpenChange,
  businessTypes,
  stateRegions,
  districts,
  townships,
  onPasswordGenerated,
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

  // Cascading location state
  const [selectedStateRegionId, setSelectedStateRegionId] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedTownshipId, setSelectedTownshipId] = useState("");

  const stateRegionNames = useMemo(() => stateRegions.map((sr) => sr.name), [stateRegions]);
  const stateRegionIdByName = useMemo(
    () => new Map(stateRegions.map((sr) => [sr.name, String(sr.state_region_id)])),
    [stateRegions],
  );
  const stateRegionNameById = useMemo(
    () => new Map(stateRegions.map((sr) => [String(sr.state_region_id), sr.name])),
    [stateRegions],
  );

  const filteredDistricts = useMemo(
    () => selectedStateRegionId ? districts.filter((d) => String(d.state_region_id) === selectedStateRegionId) : [],
    [districts, selectedStateRegionId],
  );
  const districtNames = useMemo(() => filteredDistricts.map((d) => d.name), [filteredDistricts]);
  const districtIdByName = useMemo(
    () => new Map(filteredDistricts.map((d) => [d.name, String(d.district_id)])),
    [filteredDistricts],
  );
  const districtNameById = useMemo(
    () => new Map(filteredDistricts.map((d) => [String(d.district_id), d.name])),
    [filteredDistricts],
  );

  const filteredTownships = useMemo(
    () => selectedDistrictId ? townships.filter((t) => String(t.district_id) === selectedDistrictId) : [],
    [townships, selectedDistrictId],
  );
  const townshipNames = useMemo(() => filteredTownships.map((t) => t.name), [filteredTownships]);
  const townshipIdByName = useMemo(
    () => new Map(filteredTownships.map((t) => [t.name, String(t.township_id)])),
    [filteredTownships],
  );

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
    if (!selectedTownshipId) {
      toast.error("Location is required — select State, District, and Township");
      return;
    }
    formData.set("township_id", selectedTownshipId);
    formData.set("is_approved_partner", isPartner ? "1" : "0");
    startTransition(async () => {
      const result = await createAppUser(formData);

      if (result.success && result.password) {
        toast.success("User created");
        onOpenChange(false);
        setSelectedBT("");
        setIsPartner(false);
        setSelectedStateRegionId("");
        setSelectedDistrictId("");
        setSelectedTownshipId("");
        onPasswordGenerated(result.password);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) {
          setSelectedBT("");
          setIsPartner(false);
          setSelectedStateRegionId("");
          setSelectedDistrictId("");
          setSelectedTownshipId("");
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
              type="tel"
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
        <Field
          orientation="vertical"
          className={
            isOther ? undefined : "sm:col-span-2 sm:max-w-[calc(50%-0.75rem)]"
          }
        >
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
            <FieldError
              show={!selectedBT}
              message="Business type is required"
            />
          </FieldContent>
        </Field>

        {isOther && (
          <Field orientation="vertical">
            <FieldLabel>Specify Business Type</FieldLabel>
            <FieldContent>
              <RequiredInput
                name="business_type_other"
                placeholder="e.g. Consulting Firm"
                errorMessage="Please specify the business type"
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

        {/* Row 5: Location (cascading) */}
        <Field orientation="vertical">
          <FieldLabel>State / Region</FieldLabel>
          <FieldContent>
            <Combobox
              value={stateRegionNameById.get(selectedStateRegionId) ?? ""}
              onValueChange={(val) => {
                const id = val ? stateRegionIdByName.get(val) ?? "" : "";
                setSelectedStateRegionId(id);
                setSelectedDistrictId("");
                setSelectedTownshipId("");
              }}
              items={stateRegionNames}
            >
              <ComboboxInput placeholder="Select state / region..." showClear={!!selectedStateRegionId} />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No state / region found</ComboboxEmpty>
                  <ComboboxCollection>
                    {(name) => <ComboboxItem key={name} value={name}>{name}</ComboboxItem>}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError show={!selectedStateRegionId} message="State / Region is required" />
          </FieldContent>
        </Field>

        <Field orientation="vertical">
          <FieldLabel>District</FieldLabel>
          <FieldContent>
            <Combobox
              value={districtNameById.get(selectedDistrictId) ?? ""}
              onValueChange={(val) => {
                const id = val ? districtIdByName.get(val) ?? "" : "";
                setSelectedDistrictId(id);
                setSelectedTownshipId("");
              }}
              items={districtNames}
              disabled={!selectedStateRegionId}
            >
              <ComboboxInput placeholder={selectedStateRegionId ? "Select district..." : "Select state first"} showClear={!!selectedDistrictId} disabled={!selectedStateRegionId} />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No district found</ComboboxEmpty>
                  <ComboboxCollection>
                    {(name) => <ComboboxItem key={name} value={name}>{name}</ComboboxItem>}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError show={!!selectedStateRegionId && !selectedDistrictId} message="District is required" />
          </FieldContent>
        </Field>

        <Field orientation="vertical" className="sm:col-span-2 sm:max-w-[calc(50%-0.75rem)]">
          <FieldLabel>Township</FieldLabel>
          <FieldContent>
            <Combobox
              value={filteredTownships.find((t) => String(t.township_id) === selectedTownshipId)?.name ?? ""}
              onValueChange={(val) => {
                const id = val ? townshipIdByName.get(val) ?? "" : "";
                setSelectedTownshipId(id);
              }}
              items={townshipNames}
              disabled={!selectedDistrictId}
            >
              <ComboboxInput placeholder={selectedDistrictId ? "Select township..." : "Select district first"} showClear={!!selectedTownshipId} disabled={!selectedDistrictId} />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No township found</ComboboxEmpty>
                  <ComboboxCollection>
                    {(name) => <ComboboxItem key={name} value={name}>{name}</ComboboxItem>}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError show={!!selectedDistrictId && !selectedTownshipId} message="Township is required" />
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
  );
}
