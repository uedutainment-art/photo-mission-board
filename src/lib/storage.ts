import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export interface UploadedImageResult {
  originalUrl: string;
  thumbUrl: string;
  originalPath: string;
  thumbPath: string;
  width: number;
  height: number;
  bytes: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지를 읽지 못했습니다."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("썸네일을 만들지 못했습니다."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.88,
    );
  });
}

async function createSquareThumb(file: File, size: number): Promise<{ blob: Blob; width: number; height: number }> {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("이미지 처리를 준비하지 못했습니다.");
  }

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);

  canvas.width = size;
  canvas.height = size;
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);

  return {
    blob: await canvasToBlob(canvas),
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

export async function uploadImage(file: File, basePath: string): Promise<UploadedImageResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("이미지는 15MB 이하만 업로드할 수 있습니다.");
  }

  const originalPath = `${basePath}.jpg`;
  const thumbPath = `${basePath}-thumb.jpg`;
  const thumb = await createSquareThumb(file, 1024);
  const originalRef = ref(storage, originalPath);
  const thumbRef = ref(storage, thumbPath);

  await uploadBytes(originalRef, file, {
    contentType: file.type || "image/jpeg",
  });
  await uploadBytes(thumbRef, thumb.blob, {
    contentType: "image/jpeg",
  });

  const [originalUrl, thumbUrl] = await Promise.all([
    getDownloadURL(originalRef),
    getDownloadURL(thumbRef),
  ]);

  return {
    originalUrl,
    thumbUrl,
    originalPath,
    thumbPath,
    width: thumb.width,
    height: thumb.height,
    bytes: file.size,
  };
}
