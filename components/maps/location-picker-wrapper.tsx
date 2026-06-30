import dynamic from "next/dynamic";

const LocationPickerInner = dynamic(
  () => import("@/components/maps/location-picker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-lg bg-muted">
        <p className="text-sm text-muted-foreground">Loading map…</p>
      </div>
    ),
  },
);

interface LocationPickerWrapperProps {
  value: { lat: number; lng: number; label?: string } | null;
  onChange: (location: { lat: number; lng: number; label?: string }) => void;
}

export function LocationPickerWrapper(props: LocationPickerWrapperProps) {
  return <LocationPickerInner {...props} />;
}
