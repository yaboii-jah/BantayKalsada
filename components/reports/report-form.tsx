"use client";

import { useCallback, useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Send, Loader2, Save, WifiOff } from "lucide-react";

import { barangayEnum, createReportSchema, reportSeverityEnum, type CreateReportInput } from "@/lib/validations/report";
import { submitReport } from "@/app/actions";
import { saveDraft, getDraft, deleteDraft, updateDraftStatus, type OfflineDraft, type PhotoBlob } from "@/lib/offline/db";
import { processDraft } from "@/lib/offline/queue";
import { useDrafts } from "@/lib/offline/draft-context";

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
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [initialBlobs, setInitialBlobs] = useState<PhotoBlob[] | undefined>(undefined);
  const { refreshDrafts } = useDrafts();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const id = searchParams.get("draftId");
    if (!id) return;
    setDraftId(id);
    getDraft(id).then((draft) => {
      if (!draft) return;
      setInitialBlobs(draft.photos);
      for (const [key, value] of Object.entries(draft.formData)) {
        if (value !== undefined) {
          setValue(key as keyof CreateReportInput, value as never, { shouldValidate: false });
        }
      }
    });
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
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

  const [photoBlobs, setPhotoBlobs] = useState<PhotoBlob[]>([]);

  const onPhotosChange = useCallback(
    (urls: string[]) => {
      setValue("photo_urls", urls, { shouldValidate: true });
    },
    [setValue],
  );

  const onBlobsChange = useCallback(
    (blobs: PhotoBlob[]) => {
      setPhotoBlobs(blobs);
      setValue("photo_urls", blobs.length > 0 ? ["__draft__"] : [], { shouldValidate: false });
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

  const saveDraftHandler = useCallback(async () => {
    const values = getValues();
    if (!values.title || !values.category) {
      toast.error("Please fill in at least the title and category before saving.");
      return;
    }
    setSavingDraft(true);
    try {
      const id = draftId ?? crypto.randomUUID();
      const draft: OfflineDraft = {
        id,
        formData: {
          title: values.title,
          description: values.description ?? "",
          category: values.category,
          barangay: values.barangay,
          severity: values.severity ?? "MINOR",
          latitude: values.latitude ?? 0,
          longitude: values.longitude ?? 0,
          location_label: values.location_label,
        },
        photos: photoBlobs,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      await saveDraft(draft);
      setDraftId(id);
      toast.success("Draft saved!");
      await refreshDrafts();
      if (!isOnline) {
        router.push("/my-drafts");
      }
    } catch {
      toast.error("Failed to save draft");
    } finally {
      setSavingDraft(false);
    }
  }, [getValues, draftId, photoBlobs, refreshDrafts, isOnline, router]);

  const onSubmit = useCallback(
    (data: CreateReportInput) => {
      if (!isOnline) {
        saveDraftHandler();
        return;
      }
      setSubmitError(null);
      startTransition(async () => {
        const result = await submitReport(null, data);
        if (result.success && result.data) {
          toast.success("Report submitted successfully! It will be reviewed by an administrator.");
          if (draftId) {
            await updateDraftStatus(draftId, "submitted", {
              reportId: result.data.id,
              submittedAt: new Date().toISOString(),
            });
          }
          router.push("/my-reports");
        } else {
          setSubmitError(result.error ?? "Failed to submit report");
          toast.error(result.error ?? "Failed to submit report");
        }
      });
    },
    [router, isOnline, saveDraftHandler, draftId],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
          <WifiOff className="size-4 shrink-0" />
          <span>
            You&apos;re offline. Your report will be saved as a draft and you can submit it once you&apos;re back online.
          </span>
        </div>
      )}

      {draftId && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          Editing draft.{" "}
          <button
            type="button"
            className="underline hover:text-primary"
            onClick={() => router.push("/my-drafts")}
          >
            View all drafts
          </button>
        </div>
      )}

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
        <PhotoUpload
          onChange={onPhotosChange}
          offline={!isOnline}
          onBlobsChange={onBlobsChange}
          initialBlobs={initialBlobs}
        />
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

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={pending || savingDraft}
          className="flex-1"
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
              {isOnline ? "Submit Report" : "Save Draft"}
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={savingDraft || pending}
          onClick={saveDraftHandler}
        >
          {savingDraft ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          <span className="sr-only md:not-sr-only md:ml-2">Save Draft</span>
        </Button>
      </div>
    </form>
  );
}