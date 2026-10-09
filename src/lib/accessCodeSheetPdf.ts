import { createQrDataUrl, getEventHubUrl } from "./qr";
import { formatKoreanDate } from "./formatDate";
import { getTeamLabel } from "./teamLabel";
import type { ParticipantAccessCode } from "../hooks/useAccessCodes";
import type { MissionEvent } from "./types";

const WIDTH = 1240;
const HEIGHT = 1754;
const CARDS_PER_PAGE = 8;
const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", sans-serif';

interface AccessSheetTeam {
  id: string;
  index: number;
  name: string;
  displayName: string;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

async function createPage(
  eventId: string,
  event: MissionEvent,
  entries: Array<{ code: string; team: AccessSheetTeam }>,
  pageNumber: number,
  pageCount: number,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("가족 코드 인쇄 이미지를 준비하지 못했습니다.");

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.fillStyle = "#0f172a";
  context.font = `900 46px ${FONT}`;
  context.fillText(event.title, 70, 72);
  context.fillStyle = "#64748b";
  context.font = `800 20px ${FONT}`;
  context.fillText(formatKoreanDate(event.scheduledAt) || "가족 사진 콘테스트", 72, 108);
  context.textAlign = "right";
  context.fillText(`${pageNumber}/${pageCount}`, WIDTH - 70, 108);
  context.textAlign = "left";

  const qrUrl = getEventHubUrl(eventId);
  const qrDataUrl = await createQrDataUrl(qrUrl, 320);
  const qrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("공통 QR을 만들지 못했습니다."));
    image.src = qrDataUrl;
  });

  const marginX = 70;
  const top = 145;
  const gap = 20;
  const cardWidth = (WIDTH - marginX * 2 - gap) / 2;
  const cardHeight = 370;

  entries.forEach(({ code, team }, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = marginX + col * (cardWidth + gap);
    const y = top + row * (cardHeight + gap);

    roundedRect(context, x, y, cardWidth, cardHeight, 22);
    context.fillStyle = "#ffffff";
    context.fill();
    context.strokeStyle = "#dbe4ef";
    context.lineWidth = 2;
    context.stroke();
    context.drawImage(qrImage, x + 24, y + 50, 220, 220);

    context.fillStyle = "#2563eb";
    context.font = `900 18px ${FONT}`;
    context.fillText("가족 사진 미션", x + 270, y + 72);
    context.fillStyle = "#0f172a";
    context.font = `900 30px ${FONT}`;
    context.fillText(getTeamLabel(team), x + 270, y + 118, cardWidth - 292);
    context.fillStyle = "#64748b";
    context.font = `800 17px ${FONT}`;
    context.fillText("가족 코드", x + 270, y + 166);
    context.fillStyle = "#0f172a";
    context.font = `900 48px ${FONT}`;
    context.fillText(code, x + 270, y + 222);
    context.fillStyle = "#64748b";
    context.font = `700 15px ${FONT}`;
    context.fillText("QR → 사진 콘테스트 → 코드 입력", x + 270, y + 262);

    context.fillStyle = "#f1f5f9";
    context.fillRect(x + 24, y + 298, cardWidth - 48, 1);
    context.fillStyle = "#475569";
    context.font = `700 15px ${FONT}`;
    context.fillText("가족별 한 표 · 다른 가족에게 코드를 공유하지 마세요", x + 24, y + 334);
  });

  return canvas.toDataURL("image/png");
}

export async function downloadFamilyAccessSheetPdf(
  eventId: string,
  event: MissionEvent,
  teams: AccessSheetTeam[],
  codes: ParticipantAccessCode[],
): Promise<void> {
  const codeByTeamId = new Map(codes.map((code) => [code.teamId, code.displayCode]));
  const entries = [...teams]
    .sort((a, b) => a.index - b.index)
    .map((team) => ({ team, code: codeByTeamId.get(team.id) ?? "미발급" }));
  if (entries.length === 0) throw new Error("인쇄할 가족 정보가 없습니다.");

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ format: "a4", orientation: "portrait", unit: "mm" });
  const pageCount = Math.ceil(entries.length / CARDS_PER_PAGE);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) pdf.addPage("a4", "portrait");
    const pageEntries = entries.slice(pageIndex * CARDS_PER_PAGE, (pageIndex + 1) * CARDS_PER_PAGE);
    const image = await createPage(eventId, event, pageEntries, pageIndex + 1, pageCount);
    pdf.addImage(image, "PNG", 0, 0, 210, 297);
  }
  pdf.save(`${event.title.replace(/[\\/:*?"<>|]+/g, "").trim() || "event"}-family-codes.pdf`);
}
