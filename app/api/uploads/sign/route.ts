import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCloudinaryConfig, generateSignature } from "@/lib/cloudinary";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("upload_sign_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneHourAgo);

    if (count !== null && count >= 30) {
      return NextResponse.json(
        { success: false, error: "Upload limit reached. Try again later." },
        { status: 429 },
      );
    }

    await supabase.from("upload_sign_log").insert({ user_id: user.id });

    const config = getCloudinaryConfig();
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
      timestamp,
      upload_preset: config.uploadPreset,
    };
    const signature = generateSignature(params);

    return NextResponse.json({
      success: true,
      data: {
        signature,
        timestamp,
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        upload_preset: config.uploadPreset,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to generate upload signature" },
      { status: 500 },
    );
  }
}
