"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Send, Loader2, Star } from "lucide-react";

import { InlineSelect } from "@/components/ui/inline-select";
import { createFeedbackSchema, type CreateFeedbackInput } from "@/lib/validations/feedback";
import { submitFeedback } from "@/app/actions";
import { PhotoUpload } from "@/components/reports/photo-upload";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const typeOptions = [
  { value: "", label: "Select feedback type" },
  { value: "BUG_REPORT", label: "Bug Report" },
  { value: "FEATURE_REQUEST", label: "Feature Request" },
  { value: "GENERAL", label: "General Feedback" },
];

export function FeedbackForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateFeedbackInput>({
    resolver: zodResolver(createFeedbackSchema),
    defaultValues: {
      type: undefined,
      title: "",
      description: "",
      rating: null,
      photo_urls: [],
    },
  });

  const selectedRating = useWatch<CreateFeedbackInput, "rating">({
    control,
    name: "rating",
  });
  const selectedType = useWatch<CreateFeedbackInput, "type">({
    control,
    name: "type",
  });

  const onSubmit = handleSubmit((data) => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await submitFeedback({ ...data, photo_urls: photoUrls });
      if (result.success) {
        toast.success("Feedback submitted! Thank you.");
        router.push("/my-feedback");
      } else {
        setSubmitError(result.error ?? "Something went wrong");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {submitError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <InlineSelect
          id="type"
          value={selectedType ?? ""}
          options={typeOptions}
          onSelect={(v) => setValue("type", v as CreateFeedbackInput["type"], { shouldValidate: true })}
        />
        {errors.type && (
          <p className="text-xs text-destructive">{errors.type.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Brief summary of your feedback"
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
          placeholder="Describe your feedback in detail..."
          rows={6}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label id="photos-label">Photos (optional)</Label>
        <div role="group" aria-labelledby="photos-label">
          <PhotoUpload onChange={setPhotoUrls} />
        </div>
      </div>

      <div className="space-y-2">
        <Label id="rating-label">Rating (optional)</Label>
        <div role="group" aria-labelledby="rating-label" className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= (hoveredStar || selectedRating || 0);
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() =>
                  setValue(
                    "rating",
                    selectedRating === star ? null : star,
                    { shouldValidate: true },
                  )
                }
                aria-pressed={filled}
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                className="rounded-sm p-0.5 transition-colors hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star
                  className={`size-6 ${
                    filled
                      ? "fill-status-pending text-status-pending"
                      : "fill-none text-muted-foreground/60"
                  }`}
                />
              </button>
            );
          })}
          {selectedRating && (
            <span className="ml-2 text-xs text-muted-foreground">
              {selectedRating}/5
            </span>
          )}
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="mr-2 size-4" />
            Submit Feedback
          </>
        )}
      </Button>
    </form>
  );
}
