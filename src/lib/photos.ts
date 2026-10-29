import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_SIDE = 1600;

/**
 * Phones shoot 12+ MP; the office needs a clear photo, not a 6 MB file over a job-site signal.
 * Scales the long side down to 1600 px and re-encodes as JPEG. Falls back to the original.
 */
export async function shrinkPhoto(asset: { uri: string; width?: number; height?: number; mimeType?: string | null }): Promise<{ uri: string; mimeType: string }> {
  try {
    const w = asset.width ?? 0;
    const h = asset.height ?? 0;
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (w > MAX_SIDE || h > MAX_SIDE) ctx.resize(w >= h ? { width: MAX_SIDE } : { height: MAX_SIDE });
    const image = await ctx.renderAsync();
    const out = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    return { uri: out.uri, mimeType: "image/jpeg" };
  } catch {
    return { uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" };
  }
}
