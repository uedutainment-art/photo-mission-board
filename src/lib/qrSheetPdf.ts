import { createQrDataUrl, getTeamQrUrl } from "./qr";
import { formatKoreanDate } from "./formatDate";
import { getTeamLabel } from "./teamLabel";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PDF_CANVAS_WIDTH = 1240;
const PREVIEW_CANVAS_WIDTH = 620;
const FONT_STACK = '"Noto Sans KR", "Apple SD Gothic Neo", "Segoe UI", sans-serif';

export interface QrSheetEvent {
  title: string;
  subtitle?: string;
  scheduledAt?: string;
}

export interface QrSheetTeam {
  index: number;
  name: string;
  displayName: string;
  color: string;
  token: string;
}

interface QrSheetOptions {
  widthPx?: number;
}

interface SheetGrid {
  cols: number;
  rows: number;
}

function getSheetGrid(teamCount: number): SheetGrid {
  if (teamCount <= 1) {
    return { cols: 1, rows: 1 };
  }

  if (teamCount <= 10) {
    return { cols: 2, rows: Math.ceil(teamCount / 2) };
  }

  if (teamCount <= 18) {
    return { cols: 3, rows: Math.ceil(teamCount / 3) };
  }

  if (teamCount <= 32) {
    return { cols: 4, rows: Math.ceil(teamCount / 4) };
  }

  const cols = Math.ceil(Math.sqrt(teamCount * 0.72));
  return { cols, rows: Math.ceil(teamCount / cols) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("QR 이미지를 만들지 못했습니다."));
    };
    image.src = src;
  });
}

function setCanvasFont(
  context: CanvasRenderingContext2D,
  weight: number,
  size: number,
): void {
  context.font = `${weight} ${size}px ${FONT_STACK}`;
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  minFontSize: number,
  weight: number,
  color: string,
  align: CanvasTextAlign = "left",
): void {
  let nextSize = fontSize;
  setCanvasFont(context, weight, nextSize);

  while (context.measureText(text).width > maxWidth && nextSize > minFontSize) {
    nextSize -= 1;
    setCanvasFont(context, weight, nextSize);
  }

  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = "alphabetic";
  context.fillText(text, x, y);
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const nextRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + nextRadius, y);
  context.lineTo(x + width - nextRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + nextRadius);
  context.lineTo(x + width, y + height - nextRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - nextRadius, y + height);
  context.lineTo(x + nextRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - nextRadius);
  context.lineTo(x, y + nextRadius);
  context.quadraticCurveTo(x, y, x + nextRadius, y);
  context.closePath();
}

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

function sanitizeFileName(value: string): string {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "team-qr"
  );
}

async function drawTeamCell(
  context: CanvasRenderingContext2D,
  team: QrSheetTeam,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
): Promise<void> {
  const padding = 20 * scale;
  const url = getTeamQrUrl(team.token);
  const horizontal = width / height > 1.35;
  const qrSize = horizontal
    ? Math.min(height - padding * 2, width * 0.42, 214 * scale)
    : Math.min(width - padding * 2, height * 0.58, 214 * scale);
  const qrDataUrl = await createQrDataUrl(url, Math.max(180, Math.round(qrSize * 2)));
  const qrImage = await loadImage(qrDataUrl);
  const label = getTeamLabel(team);
  const radius = 22 * scale;

  context.save();
  drawRoundedRect(context, x, y, width, height, radius);
  context.fillStyle = "#ffffff";
  context.fill();
  context.strokeStyle = "#dbe4ef";
  context.lineWidth = 2 * scale;
  context.stroke();

  drawRoundedRect(context, x + 10 * scale, y + 10 * scale, 9 * scale, height - 20 * scale, 5 * scale);
  context.fillStyle = team.color || "#2563eb";
  context.fill();

  context.imageSmoothingEnabled = false;

  if (horizontal) {
    const qrX = x + padding + 14 * scale;
    const qrY = y + (height - qrSize) / 2;
    const textX = qrX + qrSize + 22 * scale;
    const textWidth = x + width - padding - textX;
    const textCenterY = y + height / 2;

    context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    context.imageSmoothingEnabled = true;
    drawFittedText(context, label, textX, textCenterY - 36 * scale, textWidth, 28 * scale, 15 * scale, 900, "#0f172a");
    drawFittedText(context, "스캔해서 입장", textX, textCenterY - 6 * scale, textWidth, 17 * scale, 11 * scale, 800, "#2563eb");
    drawFittedText(context, displayUrl(url), textX, textCenterY + 25 * scale, textWidth, 15 * scale, 9 * scale, 700, "#64748b");
  } else {
    const qrX = x + (width - qrSize) / 2;
    const qrY = y + 22 * scale;
    const centerX = x + width / 2;

    context.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
    context.imageSmoothingEnabled = true;
    drawFittedText(context, label, centerX, qrY + qrSize + 30 * scale, width - padding * 2, 24 * scale, 12 * scale, 900, "#0f172a", "center");
    drawFittedText(context, displayUrl(url), centerX, qrY + qrSize + 52 * scale, width - padding * 2, 13 * scale, 8 * scale, 700, "#64748b", "center");
  }

  context.restore();
}

export async function createTeamQrSheetDataUrl(
  event: QrSheetEvent,
  teams: QrSheetTeam[],
  options: QrSheetOptions = {},
): Promise<string> {
  if (teams.length === 0) {
    throw new Error("PDF로 만들 팀 QR이 없습니다.");
  }

  const width = options.widthPx ?? PDF_CANVAS_WIDTH;
  const height = Math.round((width * A4_HEIGHT_MM) / A4_WIDTH_MM);
  const scale = width / PDF_CANVAS_WIDTH;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  if (!context) {
    throw new Error("PDF 이미지를 준비하지 못했습니다.");
  }

  const sortedTeams = [...teams].sort((a, b) => a.index - b.index);
  const grid = getSheetGrid(sortedTeams.length);
  const marginX = 70 * scale;
  const top = 170 * scale;
  const bottom = 76 * scale;
  const gap = 22 * scale;
  const cellWidth = (width - marginX * 2 - gap * (grid.cols - 1)) / grid.cols;
  const cellHeight = (height - top - bottom - gap * (grid.rows - 1)) / grid.rows;

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#0f172a";
  const subtitle = formatKoreanDate(event.scheduledAt) || event.subtitle || "팀별 입장 QR";
  drawFittedText(context, event.title, marginX, 72 * scale, width - marginX * 2, 44 * scale, 23 * scale, 900, "#0f172a");
  drawFittedText(context, subtitle, marginX, 112 * scale, width - marginX * 2 - 210 * scale, 21 * scale, 12 * scale, 800, "#64748b");
  drawFittedText(context, `${sortedTeams.length}팀 · A4 1장`, width - marginX, 112 * scale, 190 * scale, 19 * scale, 11 * scale, 900, "#2563eb", "right");

  for (const [index, team] of sortedTeams.entries()) {
    const row = Math.floor(index / grid.cols);
    const col = index % grid.cols;
    const x = marginX + col * (cellWidth + gap);
    const y = top + row * (cellHeight + gap);

    await drawTeamCell(context, team, x, y, cellWidth, cellHeight, scale);
  }

  drawFittedText(
    context,
    "QR을 스캔하면 로그인 없이 해당 팀 페이지로 바로 입장합니다.",
    width / 2,
    height - 34 * scale,
    width - marginX * 2,
    18 * scale,
    10 * scale,
    800,
    "#64748b",
    "center",
  );

  return canvas.toDataURL("image/png");
}

export async function createTeamQrSheetPreviewUrl(
  event: QrSheetEvent,
  teams: QrSheetTeam[],
): Promise<string> {
  return createTeamQrSheetDataUrl(event, teams, { widthPx: PREVIEW_CANVAS_WIDTH });
}

export async function downloadTeamQrSheetPdf(event: QrSheetEvent, teams: QrSheetTeam[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const sheetDataUrl = await createTeamQrSheetDataUrl(event, teams);
  const pdf = new jsPDF({
    format: "a4",
    orientation: "portrait",
    unit: "mm",
  });

  pdf.addImage(sheetDataUrl, "PNG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
  pdf.save(`${sanitizeFileName(event.title)}-team-qr.pdf`);
}
