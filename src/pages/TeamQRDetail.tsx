import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clipboard,
  Download,
  Loader2,
  Share2,
  Users,
} from "lucide-react";
import { useEventTeams } from "../hooks/useEventTeams";
import { createQrDataUrl, downloadTeamQrPng, getTeamQrUrl } from "../lib/qr";
import { getParticipantLabels } from "../lib/participantTerms";
import { getTeamLabel } from "../lib/teamLabel";

export function TeamQRDetail() {
  const { eventId, teamId } = useParams();
  const { error, event, loading, teams } = useEventTeams(eventId);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const team = useMemo(() => teams.find((nextTeam) => nextTeam.id === teamId) ?? null, [teamId, teams]);
  const teamUrl = team ? getTeamQrUrl(team.token) : "";
  const participantLabels = getParticipantLabels(event);

  useEffect(() => {
    if (!teamUrl) {
      setQrDataUrl(null);
      return undefined;
    }

    let mounted = true;

    void createQrDataUrl(teamUrl, 280).then((nextDataUrl) => {
      if (mounted) {
        setQrDataUrl(nextDataUrl);
      }
    });

    return () => {
      mounted = false;
    };
  }, [teamUrl]);

  async function handleCopy() {
    if (!teamUrl) {
      return;
    }

    await navigator.clipboard.writeText(teamUrl);
    setNotice(`${participantLabels.singular} 링크를 복사했습니다.`);
  }

  async function handleShare() {
    if (!team || !teamUrl) {
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: `${getTeamLabel(team)} 입장 QR`,
        text: event ? `${event.title} ${participantLabels.singular} 입장 링크입니다.` : `Photo Mission Board ${participantLabels.singular} 링크입니다.`,
        url: teamUrl,
      });
      setNotice("공유 창을 열었습니다.");
      return;
    }

    await handleCopy();
  }

  async function handleSaveImage() {
    if (!team || !teamUrl) {
      return;
    }

    setSaving(true);

    try {
      await downloadTeamQrPng(getTeamLabel(team), teamUrl);
      setNotice("QR 이미지를 저장했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <Link
              to={eventId ? `/events/${eventId}/teams` : "/events"}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted"
              aria-label="뒤로"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="truncate text-base font-black">{team ? getTeamLabel(team) : `${participantLabels.singular} QR`}</h1>
            <div className="h-10 w-10" />
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center bg-slate-50 p-4">
          {loading && (
            <section className="card flex items-center justify-center gap-3 p-5 text-sm font-black text-app-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
              QR 불러오는 중
            </section>
          )}

          {error && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              {error}
            </section>
          )}

          {!loading && !error && !team && (
            <section className="card p-6 text-center">
              <h2 className="font-black">{participantLabels.singular} 정보를 찾을 수 없습니다</h2>
              <p className="mt-2 text-sm font-bold leading-6 text-app-muted">
                {participantLabels.singular} 목록에서 다시 QR을 선택해주세요.
              </p>
            </section>
          )}

          {!loading && !error && team && (
            <>
              <div className="mb-5 text-center">
                <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                  스캔해서 입장
                </div>
                <div className="mx-auto grid h-[280px] w-[280px] place-items-center rounded-[28px] border border-app-border bg-white p-5 shadow-card">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt={`${getTeamLabel(team)} QR`} className="h-full w-full" />
                  ) : (
                    <Loader2 className="h-7 w-7 animate-spin text-app-primary" aria-hidden="true" />
                  )}
                </div>
                <div className="mx-auto mt-4 max-w-[280px] truncate rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-app-muted">
                  {teamUrl}
                </div>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleShare();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white"
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  카톡 공유
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleSaveImage();
                  }}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 py-4 text-sm font-black disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden="true" />
                  )}
                  이미지 저장
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleCopy();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 py-4 text-sm font-black"
                >
                  <Clipboard className="h-4 w-4" aria-hidden="true" />
                  URL 복사
                </button>
              </div>

              {notice && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-black text-emerald-700">
                  {notice}
                </div>
              )}

              <section className="card mt-4 flex gap-3 p-4">
                <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-slate-100 text-app-muted">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-black">팀원 전원에게 공유</h2>
                  <p className="mt-1 text-xs font-bold leading-5 text-app-muted">
                    이 QR을 스캔한 모든 사람이 {team.name} 멤버로 입장합니다.
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
