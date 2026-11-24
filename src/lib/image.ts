/**
 * Re-encodes a user photo as a resized JPEG in the browser. Drawing to a canvas
 * discards all EXIF metadata (including GPS location) before upload.
 */
export async function processPhoto(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Please choose a JPEG, PNG or WebP photo.");
  }
  if (file.size > 15 * 1024 * 1024) throw new Error("That photo is too large (max 15 MB).");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const maxDim = 1280;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process the photo.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  for (const q of [0.82, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
    if (blob && blob.size <= 1_400_000) return blob;
  }
  throw new Error("Could not shrink the photo enough. Try a smaller one.");
}
