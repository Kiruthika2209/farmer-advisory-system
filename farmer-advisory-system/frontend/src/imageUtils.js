/** Resize/compress a photo before sending to the API (keeps free-tier payloads smaller). */
export async function fileToCompressedDataUrl(file, maxWidth = 1280, maxChars = 5_500_000) {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.85;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > maxChars && quality > 0.45) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  return dataUrl;
}
