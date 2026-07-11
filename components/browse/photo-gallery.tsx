"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getDisplayUrl } from "@/lib/cloudinary-url";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function PhotoGallery({ urls }: { urls: string[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedIndex === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [selectedIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedIndex === null) return;
    if (e.key === "Escape") { setSelectedIndex(null); return; }
    if (e.key === "ArrowLeft" && selectedIndex > 0) { setSelectedIndex(selectedIndex - 1); }
    if (e.key === "ArrowRight" && selectedIndex < urls.length - 1) { setSelectedIndex(selectedIndex + 1); }
  }, [selectedIndex, urls.length]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (urls.length === 0) return null;

  return (
    <>
      <Carousel className="w-full">
        <CarouselContent>
          {urls.map((url, index) => (
            <CarouselItem key={index}>
              <div
                className="aspect-[16/10] overflow-hidden rounded-lg bg-muted cursor-pointer"
                onClick={() => setSelectedIndex(index)}
              >
                <img
                  src={getDisplayUrl(url)}
                  alt={`Photo ${index + 1}`}
                  className="size-full object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {urls.length > 1 && (
          <>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </>
        )}
      </Carousel>

      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/90"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            onClick={() => setSelectedIndex(null)}
            aria-label="Close"
          >
            <X className="size-6" />
          </button>

          {urls.length > 1 && selectedIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex - 1); }}
              aria-label="Previous"
            >
              <ChevronLeft className="size-8" />
            </button>
          )}

          {urls.length > 1 && selectedIndex < urls.length - 1 && (
            <button
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex + 1); }}
              aria-label="Next"
            >
              <ChevronRight className="size-8" />
            </button>
          )}

          <img
            src={getDisplayUrl(urls[selectedIndex])}
            alt={`Photo ${selectedIndex + 1}`}
            className="max-h-full max-w-full object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
