import { createHash } from "node:crypto";

export function getCloudinaryConfig() {
  return {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    apiSecret: process.env.CLOUDINARY_API_SECRET!,
    uploadPreset: "bantay-kalsada",
  };
}

export function generateSignature(params: Record<string, string | number>) {
  const { apiSecret } = getCloudinaryConfig();
  const sortedKeys = Object.keys(params).sort();
  const signatureString = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join("&") + apiSecret;

  return createHash("sha256").update(signatureString).digest("hex");
}
