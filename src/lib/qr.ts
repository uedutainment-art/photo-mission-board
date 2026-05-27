import QRCode from "qrcode";
import { publicHost } from "./firebase";

const QR_DARK = "#0f172a";
const QR_LIGHT = "#ffffff";

export function getTeamQrUrl(token: string): string {
  const host = publicHost.replace(/\/$/, "");
  return `${host}/t/${token}`;
}

export async function createQrDataUrl(url: string, size = 220): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: size,
    color: {
      dark: QR_DARK,
      light: QR_LIGHT,
    },
  });
}

export async function downloadTeamQrPng(teamLabel: string, url: string): Promise<void> {
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 720,
    color: {
      dark: QR_DARK,
      light: QR_LIGHT,
    },
  });

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1080;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("이미지 저장을 준비하지 못했습니다.");
  }

  context.fillStyle = QR_LIGHT;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = QR_DARK;
  context.textAlign = "center";
  context.font = "900 48px sans-serif";
  context.fillText(teamLabel, canvas.width / 2, 100);

  context.font = "700 26px sans-serif";
  context.fillStyle = "#64748b";
  context.fillText("Photo Mission Board", canvas.width / 2, 150);

  context.drawImage(qrCanvas, 90, 210, 720, 720);

  context.font = "700 24px sans-serif";
  context.fillStyle = "#475569";
  context.fillText(url, canvas.width / 2, 990);

  const anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = `${teamLabel.replace(/\s+/g, "-")}-qr.png`;
  anchor.click();
}
