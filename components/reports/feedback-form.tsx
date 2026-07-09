"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Send, Loader2, Star, ChevronDown } from "lucide-react";

import { createFeedbackSchema, type CreateFeedbackInput } from "@/lib/validations/feedback";
import { submitFeedback } from "@/app/actions";
import { PhotoUpload } from "@/components/reports/photo-upload";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const typeLabels: Record<CreateFeedbackInput["type"], string> = {
  BUG_REPORT: "Bug Report",
  FEATURE_REQUEST: "Feature Request",
  GENERAL: "General Feedback",
};

const typeOptions = [
  { value: "", label: "Select feedback type" },
  { value: "BUG_REPORT", label: "Bug Report" },
  { value: "FEATURE_REQUEST", label: "Feature Request" },
  { value: "GENERAL", label: "General Feedback" },
];

function InlineSelect({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex h-10 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap transition-colors outline-none select-none hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {selected?.label ?? "Select"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[1000] mt-1 w-full origin-top overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-2 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground ${
                opt.value === value ? "bg-accent/50 font-medium" : ""
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
    watch,
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

  const selectedRating = watch("rating");

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
          value={watch("type") ?? ""}
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
        <Label>Photos (optional)</Label>
        <PhotoUpload onChange={setPhotoUrls} />
      </div>

      <div className="space-y-2">
        <Label>Rating (optional)</Label>
        <div className="flex items-center gap-1">
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
                className="rounded-sm p-0.5 transition-colors hover:scale-110"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
              >
                <Star
                  className={`size-6 ${
                    filled
                      ? "fill-status-pending text-status-pending"
                      : "fill-none text-muted-foreground/30"
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
