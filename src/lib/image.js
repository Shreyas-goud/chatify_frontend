const MAX_GIF_BYTES = 3.5 * 1024 * 1024;

const readAsDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(blob);
  });

// Shrinks a photo before upload: phone photos are 4-12 MB, and the API accepts 5 MB.
// GIFs are sent as they are so they keep moving.
export async function toSendableImage(file, { maxSide = 1600, quality = 0.85 } = {}) {
  if (!file?.type?.startsWith("image/")) throw new Error("Only photos can be sent.");

  if (file.type === "image/gif") {
    if (file.size > MAX_GIF_BYTES) throw new Error("That GIF is too big. Keep it under 3.5 MB.");
    return readAsDataURL(file);
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That image couldn't be opened.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  context.fillStyle = "#17181B"; // transparent PNGs land on the board colour, not black
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const webp = canvas.toDataURL("image/webp", quality);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", quality);
}
