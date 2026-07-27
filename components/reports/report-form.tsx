"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

import { barangayEnum, createReportSchema, reportSeverityEnum, type CreateReportInput } from "@/lib/validations/report";
import { submitReport } from "@/app/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhotoUpload } from "@/components/reports/photo-upload";
import { LocationPickerWrapper } from "@/components/maps/location-picker-wrapper";
import { InlineSelect } from "@/components/ui/inline-select";

import { cn } from "@/lib/utils";

const categoryLabels: Record<CreateReportInput["category"], string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage Incident",
  OTHER: "Other Road Hazard",
};

const categoryOptions = [
  { value: "", label: "Select a category" },
  ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
];

const barangayOptions = [
  { value: "", label: "Select your barangay" },
  { value: "DOLORES", label: "Dolores" },
  { value: "SAN_ISIDRO", label: "San Isidro" },
  { value: "SAN_JUAN", label: "San Juan" },
  { value: "SANTA_ANA", label: "Santa Ana" },
  { value: "MUZON", label: "Muzon" },
];

const severityCheckStyles: Record<string, string> = {
  MINOR: "has-[:checked]:border-status-approved/50 has-[:checked]:bg-status-approved/10",
  URGENT: "has-[:checked]:border-yellow-500/50 has-[:checked]:bg-yellow-500/10",
  EMERGENCY: "has-[:checked]:border-status-rejected/50 has-[:checked]:bg-status-rejected/10",
};

export function ReportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateReportInput>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      title: "",
      description: "",
      severity: "MINOR",
      barangay: undefined,
      photo_urls: [],
      latitude: undefined,
      longitude: undefined,
      location_label: undefined,
    },
  });

  const selectedCategory = watch("category");
  const selectedBarangay = watch("barangay");

  const onPhotosChange = useCallback(
    (urls: string[]) => {
      setValue("photo_urls", urls, { shouldValidate: true });
    },
    [setValue],
  );

  const onLocationChange = useCallback(
    (location: { lat: number; lng: number; label?: string }) => {
      setValue("latitude", location.lat, { shouldValidate: true });
      setValue("longitude", location.lng, { shouldValidate: true });
      if (location.label) {
        setValue("location_label", location.label, { shouldValidate: false });
      }
    },
    [setValue],
  );

  const onSubmit = useCallback(
    (data: CreateReportInput) => {
      setSubmitError(null);
      startTransition(async () => {
        const result = await submitReport(null, data);
        if (result.success && result.data) {
          toast.success("Report submitted successfully! It will be reviewed by an administrator.");
          router.push("/my-reports");
        } else {
          setSubmitError(result.error ?? "Failed to submit report");
          toast.error(result.error ?? "Failed to submit report");
        }
      });
    },
    [router],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="space-y-2">
        <Label>Category</Label>
        <InlineSelect
          value={selectedCategory ?? ""}
          options={categoryOptions}
          onSelect={(value) => setValue("category", value as CreateReportInput["category"], { shouldValidate: true })}
          placeholder="Select a category"
        />
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. Large pothole on EDSA northbound"
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the hazard in detail — location, severity, time observed..."
          className="min-h-[120px]"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <fieldset className="space-y-3">
        <Label>Severity</Label>
        <div className="flex gap-3">
          {reportSeverityEnum.options.map((value) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm transition-colors",
                severityCheckStyles[value],
              )}
            >
              <input
                type="radio"
                value={value}
                {...register("severity")}
                className="size-4 accent-primary"
              />
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label>Barangay *</Label>
        <InlineSelect
          value={selectedBarangay ?? ""}
          options={barangayOptions}
          onSelect={(value) => setValue("barangay", value as CreateReportInput["barangay"], { shouldValidate: true })}
          placeholder="Select your barangay"
        />
        {errors.barangay && (
          <p className="text-xs text-destructive">{errors.barangay.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Photos</Label>
        <PhotoUpload onChange={onPhotosChange} />
        {errors.photo_urls && (
          <p className="text-xs text-destructive">{errors.photo_urls.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <LocationPickerWrapper value={null} onChange={onLocationChange} />
        {(errors.latitude || errors.longitude) && (
          <p className="text-xs text-destructive">
            Please pin the location on the map
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full"
        size="lg"
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Send className="mr-2 size-4" />
            Submit Report
          </>
        )}
      </Button>
    </form>
  );
}
