"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Send, Loader2, Save, CheckCircle } from "lucide-react";

import { createReportSchema, reportSeverityEnum, type CreateReportInput } from "@/lib/validations/report";
import { submitReport, updateReport } from "@/app/actions";
import { addQueuedReport, overwriteQueuedReport } from "@/lib/offline-queue";
import { isPointInTaytay } from "@/lib/taytay-boundary";
import { useOnline } from "@/lib/use-online";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth/session-user";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhotoUpload } from "@/components/reports/photo-upload";
import { LocationPickerWrapper } from "@/components/maps/location-picker-wrapper";
import { InlineSelect } from "@/components/ui/inline-select";
import { TaytayTilesPreloader } from "@/components/offline/taytay-tiles-preloader";

import { cn } from "@/lib/utils";

const offlineReportSchema = createReportSchema.omit({ photo_urls: true });

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

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  return err instanceof Error && /fetch|network|load failed/i.test(err.message);
}

interface ReportFormProps {
  defaultValues?: CreateReportInput;
  reportId?: string;
  draftId?: string;
  draftMeta?: { userId: string; queuedAt: string };
  draftInitialPhotoFiles?: File[];
}

export function ReportForm({ defaultValues, reportId, draftId, draftMeta, draftInitialPhotoFiles }: ReportFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { isOnline } = useOnline();
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [offlineDialogOpen, setOfflineDialogOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [isSubmittingOffline, setIsSubmittingOffline] = useState(false);
  const isEdit = !!defaultValues && !!reportId;
  const isDraft = !!defaultValues && !!draftId;

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateReportInput>({
    resolver: zodResolver(createReportSchema),
    defaultValues: defaultValues ?? {
      title: "",
      description: "",
      category: undefined,
      severity: "MINOR",
      barangay: undefined,
      photo_urls: [],
      latitude: undefined,
      longitude: undefined,
      location_label: undefined,
    },
  });

  const selectedCategory = useWatch<CreateReportInput, "category">({
    control,
    name: "category",
  });
  const selectedBarangay = useWatch<CreateReportInput, "barangay">({
    control,
    name: "barangay",
  });

  const onPhotosChange = useCallback(
    (urls: string[], files: File[]) => {
      setValue("photo_urls", urls, { shouldValidate: true });
      setPendingFiles(files);
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

  const queueOfflineReport = useCallback(
    async (data: CreateReportInput) => {
      const supabase = createSupabaseBrowserClient();
      const user = await getSessionUser(supabase);
      if (!user) {
        setSubmitError("You must be signed in to submit a report");
        return;
      }
      await addQueuedReport({
        id: crypto.randomUUID(),
        userId: user.id,
        queuedAt: new Date().toISOString(),
        title: data.title,
        description: data.description,
        category: data.category,
        barangay: data.barangay,
        severity: data.severity,
        latitude: data.latitude,
        longitude: data.longitude,
        location_label: data.location_label,
        photoUrls: data.photo_urls,
        photoFiles: pendingFiles,
      });
    },
    [pendingFiles],
  );

  const clearForm = useCallback(() => {
    reset();
    setPendingFiles([]);
    setResetKey((k) => k + 1);
  }, [reset]);

  const saveDraft = useCallback(async (data: CreateReportInput) => {
    if (!draftId || !draftMeta) return;
    await overwriteQueuedReport(draftId, {
      id: draftId,
      userId: draftMeta.userId,
      queuedAt: draftMeta.queuedAt,
      title: data.title,
      description: data.description,
      category: data.category,
      barangay: data.barangay,
      severity: data.severity,
      latitude: data.latitude,
      longitude: data.longitude,
      location_label: data.location_label,
      photoUrls: data.photo_urls.filter((url) => /^https?:\/\//.test(url)),
      photoFiles: pendingFiles,
      lastError: undefined,
    });
  }, [draftId, draftMeta, pendingFiles]);

  const onSubmit = useCallback(
    (data: CreateReportInput) => {
      setSubmitError(null);
      startTransition(async () => {
        if (isEdit && reportId) {
          const result = await updateReport(reportId, data);
          if (result.success) {
            toast.success("Report updated successfully.");
            router.push(`/my-reports/${reportId}`);
          } else {
            setSubmitError(result.error ?? "Failed to update report");
            toast.error(result.error ?? "Failed to update report");
          }
          return;
        }

        if (pendingFiles.length > 0) {
          setSubmitError(
            "Photos are still being saved on this device — please wait a moment and try again.",
          );
          toast.error("Please wait for your photos to finish uploading.");
          return;
        }

        try {
          const result = await submitReport(null, data);
          if (result.success && result.data) {
            toast.success("Report submitted successfully! It will be reviewed by an administrator.");
            router.push("/my-reports");
          } else {
            setSubmitError(result.error ?? "Failed to submit report");
            toast.error(result.error ?? "Failed to submit report");
          }
        } catch (err) {
          if (isNetworkError(err)) {
            await queueOfflineReport(data);
            setQueuedOffline(true);
            setOfflineDialogOpen(true);
            clearForm();
          } else {
            setSubmitError("An unexpected error occurred. Please try again.");
            toast.error("An unexpected error occurred. Please try again.");
          }
        }
      });
    },
    [router, isEdit, reportId, pendingFiles, queueOfflineReport, clearForm],
  );

  const handleRawSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitError(null);
      setQueuedOffline(false);

      if (isDraft) {
        const values = getValues();
        const totalPhotos = values.photo_urls.length + pendingFiles.length;
        if (totalPhotos < 1 || totalPhotos > 3) {
          setSubmitError("Please add between 1 and 3 photos");
          return;
        }
        const parsed = offlineReportSchema.safeParse(values);
        if (!parsed.success) {
          const first = parsed.error.issues[0];
          if (first && typeof first.path[0] === "string") {
            setError(first.path[0] as FieldPath<CreateReportInput>, {
              message: first.message,
            });
          }
          return;
        }
        if (!isPointInTaytay(parsed.data.latitude, parsed.data.longitude)) {
          setSubmitError(
            "Reports accepted for Taytay, Rizal only. Pin a location within Taytay.",
          );
          return;
        }
        void saveDraft({ ...parsed.data, photo_urls: values.photo_urls });
        toast.success("Offline draft updated.");
        router.push("/my-reports");
        return;
      }

      if (!isOnline) {
        if (isEdit) {
          setSubmitError(
            "You're offline. Connect to the internet to edit your report.",
          );
          return;
        }

        const values = getValues();
        const totalPhotos = values.photo_urls.length + pendingFiles.length;
        if (totalPhotos < 1 || totalPhotos > 3) {
          setSubmitError("Please add between 1 and 3 photos");
          return;
        }

        const parsed = offlineReportSchema.safeParse(values);
        if (!parsed.success) {
          const first = parsed.error.issues[0];
          if (first && typeof first.path[0] === "string") {
            setError(first.path[0] as FieldPath<CreateReportInput>, {
              message: first.message,
            });
          }
          return;
        }

        if (!isPointInTaytay(parsed.data.latitude, parsed.data.longitude)) {
          setSubmitError(
            "Reports accepted for Taytay, Rizal only. Pin a location within Taytay.",
          );
          return;
        }

        setIsSubmittingOffline(true);
        try {
          await queueOfflineReport({ ...parsed.data, photo_urls: values.photo_urls });
        } finally {
          setIsSubmittingOffline(false);
        }
        setQueuedOffline(true);
        setOfflineDialogOpen(true);
        clearForm();
        return;
      }

      void handleSubmit(onSubmit)(e);
    },
    [getValues, pendingFiles, queueOfflineReport, clearForm, setError, handleSubmit, onSubmit, isEdit, isDraft, saveDraft, router, isOnline],
  );

  return (
    <form onSubmit={handleRawSubmit} className="space-y-6">
      <TaytayTilesPreloader />
      {queuedOffline && (
        <div className="flex items-start gap-2 rounded-lg border border-status-approved/20 bg-status-approved/10 px-4 py-3 text-sm text-foreground">
          <CheckCircle className="mt-0.5 size-4 shrink-0 text-status-approved" />
          <span>
            Your report was saved offline. It will be submitted automatically
            when you&apos;re back online. You can also review it under &quot;Saved
            offline reports&quot; on My Reports.
          </span>
        </div>
      )}

      {submitError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <InlineSelect
          id="category"
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
        <legend className="text-sm font-medium leading-none text-foreground">
          Severity
        </legend>
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
        <Label htmlFor="barangay">
          Barangay <span className="text-destructive" aria-hidden="true">*</span>
          <span className="sr-only"> (required)</span>
        </Label>
        <InlineSelect
          id="barangay"
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
        <Label id="photos-label">Photos</Label>
        <div role="group" aria-labelledby="photos-label">
          <PhotoUpload
            key={resetKey}
            onChange={onPhotosChange}
            initialUrls={isEdit || isDraft ? defaultValues!.photo_urls : undefined}
            initialFiles={isDraft ? draftInitialPhotoFiles : undefined}
          />
        </div>
        {errors.photo_urls && (
          <p className="text-xs text-destructive">{errors.photo_urls.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label id="location-label">Location</Label>
        <div role="group" aria-labelledby="location-label">
          <LocationPickerWrapper
            key={resetKey}
            value={
              isEdit || isDraft
                ? { lat: defaultValues!.latitude, lng: defaultValues!.longitude, label: defaultValues!.location_label }
                : null
            }
            onChange={onLocationChange}
          />
        </div>
        {(errors.latitude || errors.longitude) && (
          <p className="text-xs text-destructive">
            Please pin the location on the map
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={pending || isSubmittingOffline}
        className="w-full"
        size="lg"
      >
        {pending || isSubmittingOffline ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {isSubmittingOffline ? "Saving…" : isEdit ? "Updating…" : "Submitting…"}
          </>
        ) : (
          <>
            {isEdit ? <Save className="mr-2 size-4" /> : <Send className="mr-2 size-4" />}
            {isEdit ? "Update Report" : "Submit Report"}
          </>
        )}
      </Button>

      <Dialog open={offlineDialogOpen} onOpenChange={setOfflineDialogOpen}>
        <DialogContent overlayClassName="bg-black/60" showCloseButton={false}>
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-full bg-status-approved/10">
              <CheckCircle className="size-5 text-status-approved" />
            </div>
            <DialogTitle>Report saved offline</DialogTitle>
            <DialogDescription>
              Your report was saved on this device. It will be submitted
              automatically when you&apos;re back online. You can also review it
              under &quot;Saved offline reports&quot; on My Reports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button className="w-full">OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
