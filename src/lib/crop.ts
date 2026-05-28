import type { CropMeta } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getCropObjectStyle(cropMeta: CropMeta | undefined): {
  objectPosition: string;
  transform: string;
  transformOrigin: string;
} {
  const x = clamp(cropMeta?.x ?? 0.5, 0, 1);
  const y = clamp(cropMeta?.y ?? 0.5, 0, 1);
  const scale = clamp(cropMeta?.scale ?? 1, 1, 3);
  const origin = `${x * 100}% ${y * 100}%`;

  return {
    objectPosition: origin,
    transform: `scale(${scale})`,
    transformOrigin: origin,
  };
}

export function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  cropMeta?: CropMeta,
): void {
  const sourceAspect = image.naturalWidth / image.naturalHeight;
  const targetAspect = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (sourceAspect > targetAspect) {
    sourceWidth = sourceHeight * targetAspect;
  } else {
    sourceHeight = sourceWidth / targetAspect;
  }

  const scale = clamp(cropMeta?.scale ?? 1, 1, 3);
  sourceWidth /= scale;
  sourceHeight /= scale;

  const centerX = clamp(cropMeta?.x ?? 0.5, 0, 1) * image.naturalWidth;
  const centerY = clamp(cropMeta?.y ?? 0.5, 0, 1) * image.naturalHeight;
  const sourceX = clamp(centerX - sourceWidth / 2, 0, image.naturalWidth - sourceWidth);
  const sourceY = clamp(centerY - sourceHeight / 2, 0, image.naturalHeight - sourceHeight);

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}
