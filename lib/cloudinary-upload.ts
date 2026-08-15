export async function uploadToCloudinary(file: File): Promise<string> {
  const res = await fetch("/api/uploads/sign", { method: "POST" });
  const { data: config } = await res.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", config.upload_preset);
  formData.append("api_key", config.api_key);
  formData.append("timestamp", String(config.timestamp));
  formData.append("signature", config.signature);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloud_name}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(err.error?.message ?? "Upload failed");
  }

  const result = await uploadRes.json();
  return result.secure_url as string;
}
