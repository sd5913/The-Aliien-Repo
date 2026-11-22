import { supabase } from "../../../lib/supabase/client";
import { requireAccountId } from "../../auth/services/auth";

export class ImageUploadError extends Error {
  constructor(readonly key: "image.format" | "image.originalSize" | "image.processing" | "image.compressedSize" | "image.uploadFailed") {
    super(key);
  }
}

export async function uploadPollImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new ImageUploadError("image.format");
  if (file.size > 10 * 1024 * 1024) throw new ImageUploadError("image.originalSize");
  const ownerId = await requireAccountId();
  const image = await createImageBitmap(file).catch(() => { throw new ImageUploadError("image.processing"); });
  let blob: Blob;
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new ImageUploadError("image.processing");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new ImageUploadError("image.processing")), "image/webp", .86));
  } finally { image.close(); }
  if (blob.size > 5 * 1024 * 1024) throw new ImageUploadError("image.compressedSize");
  const suffix = blob.type === "image/webp" ? "webp" : "png";
  const path = `${ownerId}/${crypto.randomUUID()}.${suffix}`;
  const { error } = await supabase.storage.from("poll-images").upload(path, blob, { upsert: false, contentType: blob.type });
  if (error) throw new ImageUploadError("image.uploadFailed");
  return supabase.storage.from("poll-images").getPublicUrl(path).data.publicUrl;
}
