const LANDSCAPE_WIDTH = 1776;
const LANDSCAPE_HEIGHT = 1200;
const JPEG_QUALITY = 0.94;

interface SelphyJpegResult {
  blob: Blob;
  usedFallback: boolean;
}

function loadBlobImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 JPEG로 변환하지 못했습니다."));
    };
    image.src = objectUrl;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("인쇄용 JPEG를 만들지 못했습니다."));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

function createExifSegment(): Uint8Array {
  const entryCount = 4;
  const tiffHeaderSize = 8;
  const ifdSize = 2 + entryCount * 12 + 4;
  const rationalDataOffset = tiffHeaderSize + ifdSize;
  const payload = new Uint8Array(6 + tiffHeaderSize + ifdSize + 16);
  payload.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00]);

  const view = new DataView(payload.buffer);
  const tiffOffset = 6;
  payload[tiffOffset] = 0x49;
  payload[tiffOffset + 1] = 0x49;
  view.setUint16(tiffOffset + 2, 42, true);
  view.setUint32(tiffOffset + 4, tiffHeaderSize, true);

  const ifdOffset = tiffOffset + tiffHeaderSize;
  view.setUint16(ifdOffset, entryCount, true);

  function writeShortEntry(index: number, tag: number, value: number) {
    const offset = ifdOffset + 2 + index * 12;
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, 3, true);
    view.setUint32(offset + 4, 1, true);
    view.setUint16(offset + 8, value, true);
  }

  function writeRationalEntry(index: number, tag: number, valueOffset: number) {
    const offset = ifdOffset + 2 + index * 12;
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, 5, true);
    view.setUint32(offset + 4, 1, true);
    view.setUint32(offset + 8, valueOffset, true);
  }

  writeShortEntry(0, 0x0112, 1);
  writeRationalEntry(1, 0x011a, rationalDataOffset);
  writeRationalEntry(2, 0x011b, rationalDataOffset + 8);
  writeShortEntry(3, 0x0128, 2);
  view.setUint32(ifdOffset + 2 + entryCount * 12, 0, true);

  const rationalOffset = tiffOffset + rationalDataOffset;
  view.setUint32(rationalOffset, 300, true);
  view.setUint32(rationalOffset + 4, 1, true);
  view.setUint32(rationalOffset + 8, 300, true);
  view.setUint32(rationalOffset + 12, 1, true);

  const segment = new Uint8Array(payload.length + 4);
  segment.set([0xff, 0xe1]);
  new DataView(segment.buffer).setUint16(2, payload.length + 2, false);
  segment.set(payload, 4);
  return segment;
}

async function addExifMetadata(jpeg: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await jpeg.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return jpeg;

  const exif = createExifSegment();
  const output = new Uint8Array(bytes.length + exif.length);
  output.set(bytes.subarray(0, 2));
  output.set(exif, 2);
  output.set(bytes.subarray(2), 2 + exif.length);
  return new Blob([output], { type: "image/jpeg" });
}

async function fetchImage(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("사진을 불러오지 못했습니다.");
  return loadBlobImage(await response.blob());
}

async function renderSelphyJpeg(image: HTMLImageElement): Promise<Blob> {
  const isPortrait = image.naturalHeight > image.naturalWidth;
  const canvas = document.createElement("canvas");
  canvas.width = isPortrait ? LANDSCAPE_HEIGHT : LANDSCAPE_WIDTH;
  canvas.height = isPortrait ? LANDSCAPE_WIDTH : LANDSCAPE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("인쇄용 이미지 처리를 준비하지 못했습니다.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);

  return addExifMetadata(await canvasToJpeg(canvas));
}

export async function createSelphyJpeg(
  originalUrl: string,
  fallbackUrl?: string,
): Promise<SelphyJpegResult> {
  try {
    return { blob: await renderSelphyJpeg(await fetchImage(originalUrl)), usedFallback: false };
  } catch (originalError) {
    if (!fallbackUrl) throw originalError;
    return { blob: await renderSelphyJpeg(await fetchImage(fallbackUrl)), usedFallback: true };
  }
}
