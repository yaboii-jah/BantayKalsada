"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

import { createReportSchema, type CreateReportInput } from "@/lib/validations/report";
import { submitReport } from "@/app/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhotoUpload } from "@/components/reports/photo-upload";
import { LocationPickerWrapper } from "@/components/maps/location-picker-wrapper";

const categoryLabels: Record<CreateReportInput["category"], string> = {
  POTHOLE: "Pothole",
  FLOODED_ROAD: "Flooded Road",
  ROAD_ACCIDENT: "Road Accident",
  ROAD_RAGE: "Road Rage Incident",
  BROKEN_TRAFFIC_SIGN: "Broken Traffic Sign",
  OTHER: "Other Road Hazard",
};

export function ReportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateReportInput>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      title: "",
      description: "",
      photo_urls: [],
      latitude: undefined,
      longitude: undefined,
      location_label: undefined,
    },
  });

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
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&>option]:text-foreground"
          {...register("category")}
        >
          <option value="" disabled>
            Select a category
          </option>
          {(Object.keys(categoryLabels) as CreateReportInput["category"][]).map(
            (key) => (
              <option key={key} value={key}>
                {categoryLabels[key]}
              </option>
            ),
          )}
        </select>
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
