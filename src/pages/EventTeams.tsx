import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clipboard,
  Download,
  ExternalLink,
  Loader2,
  Maximize2,
  MessageCircle,
  Pencil,
  Phone,
  Printer,
  Save,
  Share2,
  X,
} from "lucide-react";
import { useEventTeams, type TeamWithId } from "../hooks/useEventTeams";
import { formatPhone, sanitizePhone, smsHref, telHref } from "../lib/phone";
import { createQrDataUrl, getTeamQrUrl } from "../lib/qr";
import {
  createTeamQrSheetPreviewUrl,
  downloadTeamQrSheetPdf,
} from "../lib/qrSheetPdf";
import { getTeamLabel } from "../lib/teamLabel";
import { updateTeamLeader } from "../lib/teams";

function QrImage({ size, url }: { size: number; url: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void createQrDataUrl(url, size).then((nextDataUrl) => {
      if (mounted) {
        setDataUrl(nextDataUrl);
      }
    });

    return () => {
      mounted = false;
    };
  }, [size, url]);

  if (!dataUrl) {
    return (
      <div className="grid h-full w-full place-items-center rounded-xl bg-slate-100">
        <Loader2 className="h-5 w-5 animate-spin text-app-muted" aria-hidden="true" />
      </div>
    );
  }

  return <img src={dataUrl} alt="" className="h-full w-full rounded-xl bg-white object-contain" />;
}

interface TeamListCardProps {
  eventId: string;
  eventTitle: string;
  perTeamCount: number;
  team: TeamWithId;
  onCopy: (url: string) => Promise<void>;
  onNotice: (message: string) => void;
  onShare: (team: TeamWithId, url: string) => Promise<void>;
}

function TeamListCard({ eventId, eventTitle, onCopy, onNotice, onShare, perTeamCount, team }: TeamListCardProps) {
  const url = getTeamQrUrl(team.token);
  const [editingLeader, setEditingLeader] = useState(false);
  const [leaderName, setLeaderName] = useState(team.leader?.name ?? "");
  const [leaderPhone, setLeaderPhone] = useState(team.leader?.phone ?? "");
  const [leaderRole, setLeaderRole] = useState(team.leader?.role ?? "");
  const [leaderError, setLeaderError] = useState<string | null>(null);
  const [savingLeader, setSavingLeader] = useState(false);
  const membersText =
    team.joinedMembers.length > 0 ? `팀원 ${team.joinedMembers.length}명 입장` : "아직 아무도 입장 안 함";
  const leaderPhoneValue = team.leader?.phone;
  const contactMessage = `안녕하세요, ${eventTitle} 운영팀입니다.`;
  const canSaveLeader = leaderName.trim().length > 0 && sanitizePhone(leaderPhone).length > 0;

  useEffect(() => {
    setLeaderName(team.leader?.name ?? "");
    setLeaderPhone(team.leader?.phone ?? "");
    setLeaderRole(team.leader?.role ?? "");
    setLeaderError(null);
  }, [team.leader?.name, team.leader?.phone, team.leader?.role]);

  async function handleLeaderSave() {
    if (!canSaveLeader) {
      return;
    }

    setSavingLeader(true);
    setLeaderError(null);

    try {
      await updateTeamLeader(eventId, team.id, {
        name: leaderName,
        phone: leaderPhone,
        role: leaderRole,
      });
      setEditingLeader(false);
      onNotice("팀장 연락처를 저장했습니다.");
    } catch (saveError) {
      setLeaderError(saveError instanceof Error ? saveError.message : "팀장 연락처를 저장하지 못했습니다.");
    } finally {
      setSavingLeader(false);
    }
  }

  return (
    <section className="card p-3">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 flex-none rounded-2xl border border-app-border bg-white p-1">
          <QrImage size={96} url={url} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-black">{getTeamLabel(team)}</h2>
          <p className="mt-1 truncate text-xs font-bold text-app-muted">
            {membersText} · {team.uploadedCount}/{perTeamCount} 업로드
          </p>
          <p className="mt-1 truncate text-xs font-bold text-app-muted">
            {team.leader
              ? `팀장 ${team.leader.name} · ${formatPhone(team.leader.phone)}`
              : "팀장 미등록"}
          </p>
        </div>
        <div className="flex max-w-[124px] flex-none flex-wrap justify-end gap-1">
          {leaderPhoneValue && (
            <>
              <a
                href={telHref(leaderPhoneValue)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-app-muted"
                aria-label={`${team.name} 팀장 전화`}
                title="팀장 전화"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={smsHref(leaderPhoneValue, contactMessage)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-app-muted"
                aria-label={`${team.name} 팀장 문자`}
                title="팀장 문자"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              </a>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setEditingLeader((current) => !current);
            }}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-app-muted"
            aria-label={`${team.name} 팀장 편집`}
            title="팀장 편집"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              void onCopy(url);
            }}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-app-muted"
            aria-label={`${team.name} URL 복사`}
            title="URL 복사"
          >
            <Clipboard className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              void onShare(team, url);
            }}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-app-muted"
            aria-label={`${team.name} 공유`}
            title="공유"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <Link
            to={`/events/${eventId}/teams/${team.id}`}
            className="grid h-9 w-9 place-items-center rounded-xl bg-app-ink text-white"
            aria-label={`${team.name} QR 상세`}
            title="QR 상세"
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {editingLeader && (
        <div className="mt-3 rounded-2xl border border-app-border bg-slate-50 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
            <label className="block text-xs font-black text-app-muted">
              이름 *
              <input
                value={leaderName}
                onChange={(event) => setLeaderName(event.target.value)}
                placeholder="예: 박팀장"
                className="mt-1 w-full rounded-xl border border-app-border bg-white px-3 py-2 text-sm font-bold text-app-ink outline-none focus:border-app-primary"
              />
            </label>
            <label className="block text-xs font-black text-app-muted">
              전화번호 *
              <input
                value={leaderPhone}
                onChange={(event) => setLeaderPhone(event.target.value)}
                placeholder="010-1234-5678"
                inputMode="tel"
                className="mt-1 w-full rounded-xl border border-app-border bg-white px-3 py-2 text-sm font-bold text-app-ink outline-none focus:border-app-primary"
              />
            </label>
            <label className="block text-xs font-black text-app-muted sm:col-span-2">
              역할
              <input
                value={leaderRole}
                onChange={(event) => setLeaderRole(event.target.value)}
                placeholder="예: 1팀 모임 안내"
                className="mt-1 w-full rounded-xl border border-app-border bg-white px-3 py-2 text-sm font-bold text-app-ink outline-none focus:border-app-primary"
              />
            </label>
          </div>
          {leaderError && (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700">
              {leaderError}
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingLeader(false);
                setLeaderName(team.leader?.name ?? "");
                setLeaderPhone(team.leader?.phone ?? "");
                setLeaderRole(team.leader?.role ?? "");
                setLeaderError(null);
              }}
              className="flex items-center gap-1 rounded-xl border border-app-border bg-white px-3 py-2 text-xs font-black text-app-muted"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                void handleLeaderSave();
              }}
              disabled={!canSaveLeader || savingLeader}
              className="flex items-center gap-1 rounded-xl bg-app-ink px-3 py-2 text-xs font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
            >
              {savingLeader ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              저장
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function EventTeams() {
  const { eventId } = useParams();
  const { error, event, loading, teams } = useEventTeams(eventId);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheetPreviewUrl, setSheetPreviewUrl] = useState<string | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const noticeTimeoutRef = useRef<number | null>(null);

  function clearNoticeTimeout() {
    if (noticeTimeoutRef.current !== null) {
      window.clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = null;
    }
  }

  useEffect(() => {
    if (!event || teams.length === 0) {
      setSheetPreviewUrl(null);
      setSheetLoading(false);
      return undefined;
    }

    let mounted = true;

    setSheetLoading(true);
    setSheetError(null);

    void createTeamQrSheetPreviewUrl(event, teams)
      .then((previewUrl) => {
        if (mounted) {
          setSheetPreviewUrl(previewUrl);
        }
      })
      .catch(() => {
        if (mounted) {
          setSheetPreviewUrl(null);
          setSheetError("A4 미리보기를 만들지 못했습니다.");
        }
      })
      .finally(() => {
        if (mounted) {
          setSheetLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [event, teams]);

  useEffect(() => clearNoticeTimeout, []);

  function showNotice(message: string) {
    clearNoticeTimeout();
    setNotice(message);
    noticeTimeoutRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimeoutRef.current = null;
    }, 3000);
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url);
    showNotice("팀 링크를 복사했습니다.");
  }

  async function handleShare(team: TeamWithId, url: string) {
    if (navigator.share) {
      await navigator.share({
        title: `${getTeamLabel(team)} 입장 QR`,
        text: "Photo Mission Board 팀 링크입니다.",
        url,
      });
      showNotice("공유 창을 열었습니다.");
      return;
    }

    await handleCopy(url);
  }

  async function handleDownloadPdf() {
    if (!event || teams.length === 0) {
      return;
    }

    setDownloadingPdf(true);
    clearNoticeTimeout();
    setNotice(null);
    setSheetError(null);

    try {
      await downloadTeamQrSheetPdf(event, teams);
      showNotice("A4 팀 QR PDF를 저장했습니다.");
    } catch (downloadError) {
      setSheetError(downloadError instanceof Error ? downloadError.message : "PDF를 만들지 못했습니다.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <Link
              to={eventId ? `/events/${eventId}` : "/events"}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted"
              aria-label="뒤로"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="text-base font-black">팀 QR 관리</h1>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {loading && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              팀 QR 불러오는 중
            </section>
          )}

          {error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {error}
            </section>
          )}

          {!loading && !error && event && eventId && (
            <>
              <section className="mb-4 rounded-panel bg-app-ink p-5 text-white">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                  TEAM QR
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-normal">{event.title}</h2>
                <p className="mt-3 text-xs font-bold text-slate-300">
                  {event.teamCount}팀 · 팀당 {event.perTeamCount}장 · QR 자동 발급
                </p>
              </section>

              <button
                type="button"
                onClick={() => {
                  void handleDownloadPdf();
                }}
                disabled={downloadingPdf || teams.length === 0}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-app-primary px-4 py-4 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-500"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="h-4 w-4" aria-hidden="true" />
                )}
                모든 팀 QR PDF 다운로드
              </button>

              <p className="mb-4 text-center text-xs font-bold leading-5 text-app-muted">
                행사장에 인쇄해 붙이거나, 카톡으로 팀장에게 개별 발송하세요.
              </p>

              <section className="mb-4 overflow-hidden rounded-2xl border border-app-border bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                      A4 인쇄 시트
                    </p>
                    <h2 className="mt-1 text-sm font-black">{teams.length}팀 QR · 한 장 PDF</h2>
                  </div>
                  <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted">
                    <Printer className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="mx-auto mt-4 grid aspect-[210/297] w-full max-w-[220px] place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {sheetLoading && (
                    <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
                  )}
                  {!sheetLoading && sheetPreviewUrl && (
                    <img src={sheetPreviewUrl} alt="A4 팀 QR 인쇄 시트 미리보기" className="h-full w-full object-cover" />
                  )}
                  {!sheetLoading && !sheetPreviewUrl && (
                    <span className="px-4 text-center text-xs font-black text-app-muted">
                      미리보기 없음
                    </span>
                  )}
                </div>
                {sheetError && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700">
                    {sheetError}
                  </div>
                )}
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-app-muted">
                  행사장 입구나 테이블에 붙여두면 팀원들이 직접 스캔해서 입장할 수 있습니다.
                </p>
              </section>

              {notice && (
                <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                  {notice}
                </div>
              )}

              <div className="space-y-3">
                {teams.map((team) => (
                  <TeamListCard
                    key={team.id}
                    eventId={eventId}
                    eventTitle={event.title}
                    perTeamCount={event.perTeamCount}
                    team={team}
                    onCopy={handleCopy}
                    onNotice={showNotice}
                    onShare={handleShare}
                  />
                ))}
              </div>

              {teams.length === 0 && (
                <section className="card p-6 text-center">
                  <ExternalLink className="mx-auto h-8 w-8 text-app-muted" aria-hidden="true" />
                  <h2 className="mt-3 font-black">팀이 아직 없습니다</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-app-muted">
                    이벤트 생성이 끝나면 팀 QR이 자동으로 표시됩니다.
                  </p>
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
