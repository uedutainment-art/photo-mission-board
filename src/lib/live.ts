import { deleteField, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function setSlotReviewStatus(
  eventId: string,
  slotId: string,
  checked: boolean,
): Promise<void> {
  await updateDoc(doc(db, "events", eventId, "slots", slotId), {
    reviewStatus: checked ? "checked" : "unchecked",
    checkedAt: checked ? serverTimestamp() : deleteField(),
  });
}
