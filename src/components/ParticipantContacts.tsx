import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { Copy, MessageSquare, Phone, Trash2 } from "lucide-react";
import { db } from "../lib/firebase";
import { formatPhone, smsHref, telHref } from "../lib/phone";

type Contact = { id: string; familyName: string; phone: string };

export function ParticipantContacts({ eventId }: { eventId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  useEffect(() => onSnapshot(collection(db, "events", eventId, "participantContacts"), (snapshot) => {
    setContacts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Contact));
  }, () => setNotice("연락처를 불러오지 못했습니다.")), [eventId]);
  const numbers = [...new Set(contacts.filter((item) => selected.includes(item.id)).map((item) => item.phone))];
  async function copy() {
    try {
      await navigator.clipboard.writeText(numbers.join(", "));
      setNotice("선택한 번호를 복사했습니다. 메시지 앱 받는 사람에 붙여넣어주세요.");
    } catch {
      setNotice("복사하지 못했습니다. 아래 번호를 직접 선택해 복사해주세요.");
    }
  }
  async function remove(item: Contact) {
    if (!window.confirm(`${item.familyName} 연락처를 삭제할까요?`)) return;
    try {
      await deleteDoc(doc(db, "events", eventId, "participantContacts", item.id));
      setNotice("연락처를 삭제했습니다.");
    } catch {
      setNotice("삭제하지 못했습니다. 다시 시도해주세요.");
    }
  }
  return <section className="space-y-4 py-4">
    <h2 className="text-lg font-black">행사 공지 연락처</h2>
    <p className="text-sm text-app-muted">선택 동의한 가족의 대표 번호입니다. 등록 후 7일이 지나면 자동 삭제됩니다.</p>
    <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">단체 메시지는 다른 가족에게 전화번호가 공개될 수 있습니다. 번호 비공개 공지는 개별 메시지로 보내주세요. 복사한 번호도 행사 후 삭제해주세요.</p>
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={contacts.length > 0 && contacts.every((item) => selected.includes(item.id))} onChange={(e) => setSelected(e.target.checked ? contacts.map((item) => item.id) : [])} />전체 선택</label>
      <button type="button" disabled={!numbers.length} onClick={() => void copy()} className="flex items-center gap-2 rounded-md bg-app-ink px-3 py-2 text-sm text-white disabled:opacity-40"><Copy size={16} />선택 번호 복사 ({numbers.length})</button>
    </div>
    {numbers.length > 0 && <textarea aria-label="선택한 받는 사람 번호" readOnly value={numbers.join(", ")} className="w-full rounded-md border p-3 text-sm" />}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {!contacts.length && <p className="py-6 text-sm text-app-muted">등록된 대표 연락처가 없습니다.</p>}
    <ul className="divide-y">{contacts.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
      <label className="flex min-w-0 flex-1 items-center gap-3">
        <input type="checkbox" checked={selected.includes(item.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} />
        <span className="min-w-0 break-words text-sm"><strong>{item.familyName}</strong><br />{formatPhone(item.phone)}</span>
      </label>
      <a href={telHref(item.phone)} aria-label={`${item.familyName} 전화`} title="전화" className="p-3"><Phone size={18} /></a>
      <a href={smsHref(item.phone)} aria-label={`${item.familyName} 문자`} title="문자" className="p-3"><MessageSquare size={18} /></a>
      <button type="button" onClick={() => void remove(item)} aria-label={`${item.familyName} 연락처 삭제`} title="연락처 삭제" className="p-3"><Trash2 size={18} /></button>
    </li>)}</ul>
  </section>;
}
