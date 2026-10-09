import { doc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { sanitizePhone } from "./phone";

export interface ParticipantImportRow {
  displayName: string;
  leaderName?: string;
  leaderPhone?: string;
}

export interface ParticipantImportTarget {
  id: string;
  index: number;
}

export function parseParticipantImport(value: string): ParticipantImportRow[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index) => !(index === 0 && /가족명|팀명|표시.?이름/.test(line)))
    .map((line) => {
      const [displayName = "", leaderName = "", leaderPhone = ""] = line
        .split(line.includes("\t") ? "\t" : ",")
        .map((cell) => cell.trim());
      return {
        displayName,
        ...(leaderName ? { leaderName } : {}),
        ...(leaderPhone ? { leaderPhone } : {}),
      };
    })
    .filter((row) => row.displayName.length > 0);
}

export async function bulkUpdateParticipants(
  eventId: string,
  targets: ParticipantImportTarget[],
  rows: ParticipantImportRow[],
): Promise<number> {
  const sortedTargets = [...targets].sort((a, b) => a.index - b.index);
  const updates = rows.slice(0, sortedTargets.length);
  const batch = writeBatch(db);

  updates.forEach((row, index) => {
    const data: Record<string, unknown> = { displayName: row.displayName.trim() };
    const phone = sanitizePhone(row.leaderPhone ?? "");
    if (row.leaderName?.trim() && phone) {
      data.leader = { name: row.leaderName.trim(), phone };
    }
    batch.update(doc(db, "events", eventId, "teams", sortedTargets[index].id), data);
  });

  await batch.commit();
  return updates.length;
}
