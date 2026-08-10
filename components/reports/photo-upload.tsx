"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ImagePlus, X, Loader2, Camera, CloudOff } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";

function isNetworkError(err: Error): boolean {
  if (err instanceof TypeError) return true;
  return /fetch|network|load failed|failed to fetch|offline/i.test(err.message);
}

interface PhotoItem {
  id: string;
  file?: File;
  localUrl: string;
  cloudinaryUrl?: string;
  uploading: boolean;
  offlinePending: boolean;
  error?: string;
}

interface PhotoUploadProps {
  onChange: (urls: string[], pendingFiles: File[]) => void;
  initialUrls?: string[];
  initialFiles?: File[];
  className?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 3;

export function PhotoUpload({
  onChange,
  initialUrls,
  initialFiles,
  className,
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>(() => {
    const fromUrls = (initialUrls ?? []).map((url) => ({
      id: crypto.randomUUID(),
      localUrl: url,
      cloudinaryUrl: url,
      uploading: false,
      offlinePending: false,
    }));
    const fromFiles = (initialFiles ?? []).map((file) => ({
      id: crypto.randomUUID(),
      file,
      localUrl: URL.createObjectURL(file),
      uploading: false,
      offlinePending: true,
    }));
    return [...fromFiles, ...fromUrls];
  });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { isOnline } = useOnline();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const photosRef = useRef(photos);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    const urls = photos
      .filter((p) => p.cloudinaryUrl)
      .map((p) => p.cloudinaryUrl!);
    const pendingFiles = photos
      .filter((p) => p.offlinePending && p.file)
      .map((p) => p.file!);
    onChangeRef.current(urls, pendingFiles);
  }, [photos]);

  useEffect(() => {
    if (!isOnline) return;
    const pending = photosRef.current.filter((p) => p.offlinePending && p.file);
    if (pending.length === 0) return;

    for (const item of pending) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === item.id ? { ...p, uploading: true, error: undefined } : p,
        ),
      );
      uploadToCloudinary(item.file!)
        .then((url) => {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? {
                    ...p,
                    cloudinaryUrl: url,
                    uploading: false,
                    offlinePending: false,
                    file: undefined,
                    error: undefined,
                  }
                : p,
            ),
          );
        })
        .catch((err: Error) => {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, uploading: false, offlinePending: true, error: err.message }
                : p,
            ),
          );
        });
    }
  }, [isOnline]);

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
        const id = crypto.randomUUID();
        const localUrl = URL.createObjectURL(file);

        if (!isOnline) {
          newPhotos.push({ id, file, localUrl, uploading: false, offlinePending: true });
          continue;
        }

        if (!ACCEPTED_TYPES.includes(file.type)) {
          setGlobalError("Only JPEG, PNG, WebP, and HEIC files are accepted");
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setGlobalError("Each photo must be under 10 MB");
          continue;
        }

        newPhotos.push({ id, file, localUrl, uploading: true, offlinePending: false });
        uploadToCloudinary(file)
          .then((url) => {
            setPhotos((prev) =>
              prev.map((p) =>
                p.id === id
                  ? { ...p, cloudinaryUrl: url, uploading: false, offlinePending: false }
                  : p,
              ),
            );
          })
          .catch((err: Error) => {
            setPhotos((prev) =>
              prev.map((p) =>
                p.id === id
                  ? {
                      ...p,
                      uploading: false,
                      offlinePending: true,
                      error: isNetworkError(err) ? undefined : err.message,
                    }
                  : p,
              ),
            );
          });
      }

      setPhotos((prev) => [...prev, ...newPhotos]);
    },
    [photos.length, isOnline],
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.localUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

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
              <div className="absolute inset-0 flex items-center justify-center bg-destructive/80 p-1 text-center text-[10px] leading-tight text-destructive-foreground">
                {photo.error}
              </div>
            )}
            {photo.offlinePending && !photo.uploading && !photo.error && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/50 px-1 py-0.5 text-[9px] font-medium text-white">
                <CloudOff className="size-2.5" />
                Saved locally
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
          <>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className={cn(
                "flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-input text-muted-foreground transition-colors hover:border-primary hover:text-primary",
                className,
              )}
              aria-label="Take a picture"
            >
              <Camera className="size-6" />
              <span className="text-[10px] leading-tight">Camera</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className={cn(
                "flex size-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border bg-input text-muted-foreground transition-colors hover:border-primary hover:text-primary",
                className,
              )}
              aria-label="Add photo from gallery"
            >
              <ImagePlus className="size-6" />
            </button>
          </>
        )}
      </div>

      {!isOnline && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CloudOff className="size-3.5" />
          You&apos;re offline — photos are saved on this device and will be
          uploaded when you&apos;re back online.
        </p>
      )}

      {globalError && (
        <p className="text-xs text-destructive">{globalError}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {photos.length} of {MAX_PHOTOS} photos &middot; JPEG, PNG, WebP, or HEIC
        &middot; max 10 MB each
      </p>

      <input
        ref={galleryInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
