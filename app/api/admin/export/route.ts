import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/service-role";
import { toCsv } from "@/lib/csv";

const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED", "RESOLVED"] as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    if (status && !VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();

    let query = adminClient
      .from("reports")
      .select(
        "id, status, category, severity, barangay, title, description, photo_urls, latitude, longitude, location_label, submitted_by_id, reviewed_by_id, submitted_at, reviewed_at, resolved_at, rejection_reason, resolution_notes, resolved_image_urls",
      )
      .order("submitted_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: reports, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch reports" },
        { status: 500 },
      );
    }

    const submitterIds = [
      ...new Set(reports?.map((r) => r.submitted_by_id) ?? []),
    ];

    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .in("id", submitterIds);

    const profileMap = new Map(
      profiles?.map((p) => [p.id, { name: p.full_name, email: p.email }]) ?? [],
    );

    const headers = [
      "ID",
      "Status",
      "Category",
      "Severity",
      "Barangay",
      "Title",
      "Description",
      "Submitted At",
      "Reviewed At",
      "Resolved At",
      "Submitter Name",
      "Submitter Email",
      "Latitude",
      "Longitude",
      "Location Label",
      "Rejection Reason",
      "Resolution Notes",
      "Photo URLs",
      "Resolution Image URLs",
    ];

    const rows = (reports ?? []).map((r) => [
      r.id,
      r.status,
      r.category,
      r.severity,
      r.barangay ?? "",
      r.title,
      r.description,
      r.submitted_at,
      r.reviewed_at ?? "",
      r.resolved_at ?? "",
      profileMap.get(r.submitted_by_id)?.name ?? "Unknown",
      profileMap.get(r.submitted_by_id)?.email ?? "",
      String(r.latitude),
      String(r.longitude),
      r.location_label ?? "",
      r.rejection_reason ?? "",
      r.resolution_notes ?? "",
      (r.photo_urls ?? []).join("; "),
      (r.resolved_image_urls ?? []).join("; "),
    ]);

    const csv = toCsv(headers, rows);
    const filename = `bantay-kalsada-reports-${status ?? "all"}-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to export reports" },
      { status: 500 },
    );
  }
}
