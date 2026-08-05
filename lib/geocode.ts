export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ displayName?: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=fil`,
      { headers: { "User-Agent": "BantayKalsada/1.0" } },
    );
    const data = await res.json();
    return { displayName: data.display_name as string | undefined };
  } catch {
    return {};
  }
}
