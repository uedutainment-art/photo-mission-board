import type { CropMeta, FaceDetectionBox } from "./types";

const MODEL_URL = "/models";
const CENTER_CROP: CropMeta = { x: 0.5, y: 0.5, scale: 1 };

type FaceApiModule = typeof import("face-api.js");

export interface SelfieFaceCropResult {
  cropMeta: CropMeta;
  faceDetected?: FaceDetectionBox;
}

let faceApiPromise: Promise<FaceApiModule> | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundBox(box: FaceDetectionBox): FaceDetectionBox {
  return {
    h: Math.round(box.h),
    w: Math.round(box.w),
    x: Math.round(box.x),
    y: Math.round(box.y),
  };
}

function loadImage(file: File): Promise<{ dispose: () => void; image: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        dispose: () => {
          URL.revokeObjectURL(objectUrl);
        },
        image,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("셀카 이미지를 읽지 못했습니다."));
    };
    image.src = objectUrl;
  });
}

export function loadFaceApi(): Promise<FaceApiModule> {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      await import("@tensorflow/tfjs");
      const faceapi = await import("face-api.js");

      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      }

      return faceapi;
    })().catch((error: unknown) => {
      faceApiPromise = null;
      throw error;
    });
  }

  return faceApiPromise;
}

function mergeFaceBoxes(boxes: FaceDetectionBox[], imageWidth: number, imageHeight: number): FaceDetectionBox | null {
  if (boxes.length === 0) {
    return null;
  }

  const left = clamp(Math.min(...boxes.map((box) => box.x)), 0, imageWidth);
  const top = clamp(Math.min(...boxes.map((box) => box.y)), 0, imageHeight);
  const right = clamp(Math.max(...boxes.map((box) => box.x + box.w)), 0, imageWidth);
  const bottom = clamp(Math.max(...boxes.map((box) => box.y + box.h)), 0, imageHeight);

  return roundBox({
    h: Math.max(0, bottom - top),
    w: Math.max(0, right - left),
    x: left,
    y: top,
  });
}

function cropFromFaceBox(faceBox: FaceDetectionBox, imageWidth: number, imageHeight: number, faceCount: number): CropMeta {
  const centerX = faceBox.x + faceBox.w / 2;
  const centerY = faceBox.y + faceBox.h / 2;
  const faceCoverage = Math.max(faceBox.w, faceBox.h) / Math.max(1, Math.min(imageWidth, imageHeight));
  const targetCoverage = faceCount > 1 ? 0.68 : 0.46;
  const maxScale = faceCount > 1 ? 1.5 : 2.2;

  return {
    x: clamp(centerX / imageWidth, 0, 1),
    y: clamp(centerY / imageHeight, 0, 1),
    scale: clamp(targetCoverage / Math.max(faceCoverage, 0.01), 1, maxScale),
  };
}

export async function detectSelfieFaceCrop(file: File): Promise<SelfieFaceCropResult> {
  const loadedImage = await loadImage(file);

  try {
    const faceapi = await loadFaceApi();
    const detections = await faceapi.detectAllFaces(
      loadedImage.image,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 }),
    );
    const boxes = detections.map((detection) => ({
      h: detection.box.height,
      w: detection.box.width,
      x: detection.box.x,
      y: detection.box.y,
    }));
    const faceDetected = mergeFaceBoxes(boxes, loadedImage.image.naturalWidth, loadedImage.image.naturalHeight);

    if (!faceDetected) {
      return { cropMeta: CENTER_CROP };
    }

    return {
      cropMeta: cropFromFaceBox(
        faceDetected,
        loadedImage.image.naturalWidth,
        loadedImage.image.naturalHeight,
        detections.length,
      ),
      faceDetected,
    };
  } catch (error) {
    console.warn("Face detection failed; using center crop.", error);
    return { cropMeta: CENTER_CROP };
  } finally {
    loadedImage.dispose();
  }
}
