/** Error carrying a translation key, so the message is shown in the user's language. */
export class PhotoError extends Error {}

/** Longest edge sent to the AI. Large enough for small scratches, small enough to upload fast. */
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;
/** Smallest short side accepted (e.g. 480 x 360). Small web images are allowed for testing, tiny ones are not. */
const MIN_SHORT_EDGE_PX = 360;

/** Resizes and re-encodes a photo to JPEG in the browser (also strips EXIF and fixes rotation). */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new PhotoError("adminPages.inspections._errNotImage");
  }
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(
    1,
    MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("adminPages.inspections._errBrowser");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  // Below this the AI cannot see small scratches; a phone camera photo is always far larger
  if (Math.min(width, height) < MIN_SHORT_EDGE_PX) {
    throw new PhotoError("adminPages.inspections._errResolution");
  }
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
