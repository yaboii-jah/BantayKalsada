"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface PhotoItem {
  id: string;
  localUrl: string;
  cloudinaryUrl?: string;
  uploading: boolean;
  error?: string;
}

interface PhotoUploadProps {
  onChange: (urls: string[]) => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_PHOTOS = 3;

async function uploadToCloudinary(file: File): Promise<string> {
  const res = await fetch("/api/uploads/sign");
  const { data: config } = await res.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", config.upload_preset);
  formData.append("api_key", config.api_key);
  formData.append("timestamp", String(config.timestamp));
  formData.append("signature", config.signature);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloud_name}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(err.error?.message ?? "Upload failed");
  }

  const result = await uploadRes.json();
  return result.secure_url as string;
}

export function PhotoUpload({ onChange }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const syncToParent = useCallback((items: PhotoItem[]) => {
    const urls = items
      .filter((p) => p.cloudinaryUrl)
      .map((p) => p.cloudinaryUrl!);
    onChangeRef.current(urls);
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      setGlobalError(null);

      const remaining = MAX_PHOTOS - photos.length;
      if (files.length > remaining) {
        setGlobalError(
          `You can only add ${remaining} more photo${remaining !== 1 ? "s" : ""}`,
        );
        return;
      }

      const newPhotos: PhotoItem[] = [];

      for (const file of Array.from(files)) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setGlobalError("Only JPEG, PNG, and WebP files are accepted");
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setGlobalError("Each photo must be under 5 MB");
          continue;
        }

        const id = crypto.randomUUID();
        const localUrl = URL.createObjectURL(file);
        const item: PhotoItem = { id, localUrl, uploading: true };
        newPhotos.push(item);

        uploadToCloudinary(file)
          .then((url) => {
            setPhotos((prev) => {
              const updated = prev.map((p) =>
                p.id === id ? { ...p, cloudinaryUrl: url, uploading: false } : p,
              );
              syncToParent(updated);
              return updated;
            });
          })
          .catch((err: Error) => {
            setPhotos((prev) =>
              prev.map((p) =>
                p.id === id ? { ...p, uploading: false, error: err.message } : p,
              ),
            );
          });
      }

      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos.length, syncToParent],
  );

  const removePhoto = useCallback(
    (id: string) => {
      setPhotos((prev) => {
        const item = prev.find((p) => p.id === id);
        if (item) URL.revokeObjectURL(item.localUrl);
        const updated = prev.filter((p) => p.id !== id);
        syncToParent(updated);
        return updated;
      });
    },
    [syncToParent],
  );

  useEffect(() => {
    return () => {
      for (const photo of photos) {
        URL.revokeObjectURL(photo.localUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative size-24 overflow-hidden rounded-md border border-border"
          >
            <img
              src={photo.localUrl}
              alt=""
              className="size-full object-cover"
            />
            {photo.uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="size-5 animate-spin text-white" />
              </div>
            )}
            {photo.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/80 p-1 text-[10px] leading-tight text-destructive-foreground">
                {photo.error}
              </div>
            )}
            <button
              type="button"
              onClick={() => removePhoto(photo.id)}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border transition-colors hover:text-destructive"
              aria-label="Remove photo"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border bg-input text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="Add photo"
          >
            <ImagePlus className="size-6" />
          </button>
        )}
      </div>

      {globalError && (
        <p className="text-xs text-destructive">{globalError}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {photos.length} of {MAX_PHOTOS} photos &middot; JPEG, PNG, or WebP
        &middot; max 5 MB each
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
