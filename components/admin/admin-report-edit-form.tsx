"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import {
  createReportSchema,
  reportSeverityEnum,
  type CreateReportInput,
} from "@/lib/validations/report";
import { editReport } from "@/app/admin/actions";

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
  BROKEN_TRAFFIC_SIGN: "Broken Traffic Sign",
  OTHER: "Other Road Hazard",
};

const categoryOptions = [
  { value: "", label: "Select a category" },
  ...Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
];

const barangayOptions = [
  { value: "", label: "Select barangay" },
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

export function AdminReportEditForm({
  reportId,
  defaultValues,
}: {
  reportId: string;
  defaultValues: CreateReportInput;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resetKey] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateReportInput>({
    resolver: zodResolver(createReportSchema),
    defaultValues,
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
        const result = await editReport(reportId, data);
        if (result.success) {
          toast.success("Report updated.");
          router.push(`/admin/reports/${reportId}`);
        } else {
          setSubmitError(result.error ?? "Failed to update report");
          toast.error(result.error ?? "Failed to update report");
        }
      });
    },
    [router, reportId],
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
          onSelect={(value) =>
            setValue("category", value as CreateReportInput["category"], {
              shouldValidate: true,
            })
          }
          placeholder="Select a category"
        />
        {errors.category && (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register("title")} />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
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
        <Label>Barangay</Label>
        <InlineSelect
          value={selectedBarangay ?? ""}
          options={barangayOptions}
          onSelect={(value) =>
            setValue("barangay", value as CreateReportInput["barangay"], {
              shouldValidate: true,
            })
          }
          placeholder="Select barangay"
        />
        {errors.barangay && (
          <p className="text-xs text-destructive">{errors.barangay.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Photos</Label>
        <PhotoUpload
          key={resetKey}
          onChange={(urls) => onPhotosChange(urls)}
          initialUrls={defaultValues.photo_urls}
        />
        {errors.photo_urls && (
          <p className="text-xs text-destructive">{errors.photo_urls.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <LocationPickerWrapper
          key={resetKey}
          value={{
            lat: defaultValues.latitude,
            lng: defaultValues.longitude,
            label: defaultValues.location_label,
          }}
          onChange={onLocationChange}
        />
        {(errors.latitude || errors.longitude) && (
          <p className="text-xs text-destructive">
            Please pin the location on the map
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Save className="mr-2 size-4" />
            Save Changes
          </>
        )}
      </Button>
    </form>
  );
}
