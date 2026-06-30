import type { Database } from "@/types/database.types";

type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

const locations = [
  "EDSA, Quezon City",
  "C5, Taguig",
  "Commonwealth Ave, Quezon City",
  "McKinley Hill, Taguig",
  "Ortigas Ave, Pasig",
  "Taft Ave, Manila",
  "Roxas Blvd, Manila",
  "Aurora Blvd, Quezon City",
  "Marcos Highway, Antipolo",
  "Alabang-Zapote Road, Muntinlupa",
  "Macapagal Blvd, Pasay",
  "Shaw Blvd, Mandaluyong",
  "Katipunan Ave, Quezon City",
  "South Superhighway, Makati",
  "Circumferential Road, Cebu City",
];

const titles: Record<string, string[]> = {
  POTHOLE: [
    "Large pothole on northbound lane",
    "Deep pothole near the intersection",
    "Multiple potholes along the gutter",
    "Crescent-shaped pothole after the bridge",
    "Pothole cluster before the flyover",
  ],
  FLOODED_ROAD: [
    "Street flooded after light rain",
    "Deep floodwater near the market",
    "Road impassable due to flooding",
    "Flooded underpass after downpour",
    "Standing water on the inner lane",
  ],
  ROAD_ACCIDENT: [
    "SUV collided with motorcycle",
    "Tricycle overturned near the curve",
    "Delivery truck hit a pedestrian lane",
    "Rear-end collision at the traffic light",
    "Vehicle skidded off the road",
  ],
  ROAD_RAGE: [
    "Driver shouting and blocking traffic",
    "Road rage incident near the school zone",
    "Verbal altercation between two drivers",
    "Driver throwing objects at another car",
    "Aggressive tailgating and honking",
  ],
  OTHER: [
    "Open manhole on the sidewalk",
    "Fallen electric post blocking the road",
    "Debris scattered across the lane",
    "Road excavation left unmarked",
    "Slippery road due to oil spill",
  ],
};

const photoUrlSets = [
  [
    "https://images.unsplash.com/photo-1617720239136-3a55a2956825?w=600&q=80",
    "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=600&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1628624747186-a941c476b7c2?w=600&q=80",
    "https://images.unsplash.com/photo-1626014303758-1a80e7e5a2dc?w=600&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80",
    "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=600&q=80",
    "https://images.unsplash.com/photo-1600573472556-5e2b855fb0a2?w=600&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1567095761054-7a02a69a5b12?w=600&q=80",
    "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80",
    "https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=600&q=80",
    "https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?w=600&q=80",
  ],
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysAgo));
  d.setHours(randomInt(6, 22), randomInt(0, 59), randomInt(0, 59));
  return d.toISOString();
}

const categories: Database["public"]["Enums"]["report_category"][] = [
  "POTHOLE",
  "FLOODED_ROAD",
  "ROAD_ACCIDENT",
  "ROAD_RAGE",
  "OTHER",
];

export function generateMockReports(count = 36): ReportRow[] {
  const reports: ReportRow[] = [];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const status: Database["public"]["Enums"]["report_status"] =
      i % 4 === 0 ? "RESOLVED" : "APPROVED";
    const titleList = titles[category];
    const submittedAt = randomDate(30);

    reports.push({
      id: `mock-${i + 1}`,
      title: titleList[i % titleList.length],
      description: `This is a detailed description of a ${category.toLowerCase().replace(/_/g, " ")} report observed near ${locations[i % locations.length]}. The situation requires immediate attention from the local authorities to ensure public safety.`,
      category,
      status,
      photo_urls: photoUrlSets[i % photoUrlSets.length],
      latitude: 14.5 + Math.random() * 0.5,
      longitude: 121 + Math.random() * 0.3,
      location_label: locations[i % locations.length],
      rejection_reason: null,
      submitted_by_id: "mock-user",
      reviewed_by_id: "mock-admin",
      submitted_at: submittedAt,
      reviewed_at: submittedAt,
      resolved_at: status === "RESOLVED" ? randomDate(15) : null,
    });
  }

  return reports.sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
  );
}

export const MOCK_REPORTS = generateMockReports(36);
