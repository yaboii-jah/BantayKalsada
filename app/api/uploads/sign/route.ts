import { NextResponse } from "next/server";
import { getCloudinaryConfig, generateSignature } from "@/lib/cloudinary";

export async function GET() {
  try {
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
