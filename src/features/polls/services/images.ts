import { supabase } from "../../../lib/supabase/client";
import { requireAccountId } from "../../auth/services/auth";

export async function uploadPollImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("请选择 JPG、PNG 或 WebP 图片。");
  if (file.size > 10 * 1024 * 1024) throw new Error("原图不能超过 10 MB。");
  const ownerId = await requireAccountId();
  const image = await createImageBitmap(file);
  let blob: Blob;
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("图片处理失败，请更换图片重试。");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("图片处理失败")), "image/webp", .86));
  } finally { image.close(); }
  if (blob.size > 5 * 1024 * 1024) throw new Error("图片压缩后仍超过 5 MB，请选择较小的图片。");
  const suffix = blob.type === "image/webp" ? "webp" : "png";
  const path = `${ownerId}/${crypto.randomUUID()}.${suffix}`;
  const { error } = await supabase.storage.from("poll-images").upload(path, blob, { upsert: false, contentType: blob.type });
  if (error) throw new Error("图片上传失败，请检查网络后重试。");
  return supabase.storage.from("poll-images").getPublicUrl(path).data.publicUrl;
}
