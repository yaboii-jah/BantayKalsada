  "use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function PhotoGallery({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {urls.map((url, index) => (
          <CarouselItem key={index}>
            <div className="aspect-[16/10] overflow-hidden rounded-lg bg-muted">
              <img
                src={url}
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
  );
}
