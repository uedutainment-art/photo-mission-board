import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Image,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { PlaceEditModal } from "../components/PlaceEditModal";
import { getCollageFit, type CollageFitOption } from "../lib/collageGrid";
import {
  createDraftEventId,
  createEvent,
  getPerTeamCount,
  type CreateEventPlaceInput,
} from "../lib/createEvent";
import { useAuth } from "../lib/auth";
import { formatKoreanDate } from "../lib/formatDate";
import { sanitizePhone } from "../lib/phone";
import type {
  ContactPreference,
  EventUseMode,
  MapPlatform,
  OutputMode,
  SelfieMode,
  VotingResultMode,
  VotingTarget,
} from "../lib/types";

type WizardStep = 1 | 2 | 3;

const mapPlatformLabels: Record<MapPlatform, string> = {
  naver: "네이버지도",
  kakao: "카카오맵",
  google: "구글지도",
};

const selfieModeLabels: Record<SelfieMode, string> = {
  individual: "셀카",
  group: "단체사진",
  none: "없음",
};

const useModeLabels: Record<EventUseMode, string> = {
  standalone: "이 앱만 사용",
  attached: "다른 행사에 붙이기",
};

const outputModeLabels: Record<OutputMode, string> = {
  collage: "자동 콜라주",
  collection: "사진 수집",
};

const votingTargetLabels: Record<VotingTarget, string> = {
  all: "모든 사진",
  representatives: "대표 사진",
  checked: "검수 완료",
};

const votingResultModeLabels: Record<VotingResultMode, string> = {
  "team-balanced": "팀별 상위",
  popular: "전체 인기순",
};

const placeColors = ["#0284c7", "#d97706", "#7c3aed", "#16a34a", "#db2777", "#0891b2"];

function numberFromInput(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(1, parsed);
}

function StepDot({ active }: { active: boolean }) {
  return <div className={active ? "h-1.5 flex-1 rounded-full bg-app-ink" : "h-1.5 flex-1 rounded-full bg-app-border"} />;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="block text-[11px] font-black text-slate-400">{children}</span>;
}

function getStepTitle(step: WizardStep): string {
  if (step === 1) {
    return "새 이벤트";
  }

  if (step === 2) {
    return "장소 · 분배";
  }

  return "미리보기";
}

function getStepDescription(step: WizardStep): string {
  if (step === 1) {
    return "기본 정보";
  }

  if (step === 2) {
    return "팀당 사진 분배";
  }

  return "만들기 직전 확인";
}

export function EventCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const draftEventId = useMemo(() => createDraftEventId(), []);
  const [step, setStep] = useState<WizardStep>(1);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerRole, setOrganizerRole] = useState("");
  const [organizerPhone, setOrganizerPhone] = useState("");
  const [contactPreference, setContactPreference] = useState<ContactPreference>("sms-first");
  const [useMode, setUseMode] = useState<EventUseMode>("standalone");
  const [externalTitle, setExternalTitle] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalBrandName, setExternalBrandName] = useState("");
  const [outputMode, setOutputMode] = useState<OutputMode>("collage");
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [teamCount, setTeamCount] = useState(10);
  const [selfieMode, setSelfieMode] = useState<SelfieMode>("individual");
  const [votingEnabled, setVotingEnabled] = useState(false);
  const [votingTarget, setVotingTarget] = useState<VotingTarget>("representatives");
  const [votingResultMode, setVotingResultMode] = useState<VotingResultMode>("team-balanced");
  const [places, setPlaces] = useState<CreateEventPlaceInput[]>([]);
  const [editingPlace, setEditingPlace] = useState<CreateEventPlaceInput | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const grid = useMemo(() => ({ rows, cols }), [cols, rows]);
  const totalSlots = rows * cols;
  const collageFit = useMemo(() => getCollageFit(grid, teamCount), [grid, teamCount]);
  const perTeamCount = getPerTeamCount(grid, teamCount);
  const placeTotal = places.reduce((sum, place) => sum + place.perTeamCount, 0);
  const effectivePerTeamCount = outputMode === "collage" ? perTeamCount : placeTotal;
  const stepOneValid =
    title.trim().length > 0 &&
    organizerName.trim().length > 0 &&
    sanitizePhone(organizerPhone).length > 0 &&
    (outputMode === "collection" || perTeamCount !== null);
  const stepTwoValid =
    places.length > 0 &&
    places.every((place) => place.name.trim().length > 0 && place.perTeamCount > 0) &&
    (outputMode === "collection" || (perTeamCount !== null && placeTotal === perTeamCount));
  const canCreate = stepOneValid && stepTwoValid && !creating;
  const previewCells = Array.from({ length: Math.min(totalSlots, 144) }, (_, index) => index);

  function applyFitOption(option: CollageFitOption) {
    setCols(option.grid.cols);
    setRows(option.grid.rows);
  }

  function goBack() {
    if (step > 1) {
      setStep((current) => (current - 1) as WizardStep);
      return;
    }

    navigate("/events");
  }

  function openNewPlace() {
    setEditingPlace(undefined);
    setModalOpen(true);
  }

  function handleSavePlace(place: CreateEventPlaceInput) {
    setPlaces((currentPlaces) => {
      const exists = currentPlaces.some((currentPlace) => currentPlace.id === place.id);

      if (exists) {
        return currentPlaces.map((currentPlace) =>
          currentPlace.id === place.id ? place : currentPlace,
        );
      }

      return [...currentPlaces, place];
    });
    setModalOpen(false);
    setEditingPlace(undefined);
  }

  function handleDeletePlace(placeId: string) {
    setPlaces((currentPlaces) => currentPlaces.filter((place) => place.id !== placeId));
    setModalOpen(false);
    setEditingPlace(undefined);
  }

  async function handleCreateEvent() {
    if (!user || !canCreate) {
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const eventId = await createEvent({
        eventId: draftEventId,
        ownerId: user.uid,
        title,
        scheduledAt,
        organizer: {
          name: organizerName,
          role: organizerRole,
          phone: organizerPhone,
          contactPreference,
        },
        useMode,
        externalEvent:
          useMode === "attached"
            ? {
                brandName: externalBrandName,
                title: externalTitle,
                url: externalUrl,
              }
            : undefined,
        outputMode,
        grid,
        teamCount,
        places,
        selfieMode,
        voting: {
          enabled: votingEnabled,
          status: votingEnabled ? "draft" : "off",
          target: votingTarget,
          resultMode: votingResultMode,
        },
      });
      navigate(`/events/${eventId}/teams`, { replace: true });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "이벤트를 만들지 못했습니다.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-dvh bg-app-background px-4 py-6 text-app-ink">
      <section className="phone-surface overflow-hidden rounded-[28px] border border-app-border shadow-phone">
        <header className="border-b border-app-border bg-white/95 px-4 pb-4 pt-3">
          <div className="mx-auto mb-3 h-1 w-16 rounded-full bg-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted"
              aria-label="뒤로"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <h1 className="text-base font-black">{getStepTitle(step)}</h1>
            <button
              type="button"
              onClick={() => {
                navigate("/events");
              }}
              className="grid h-10 w-10 place-items-center rounded-xl text-app-muted"
              aria-label="닫기"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex gap-2 px-4 pb-2 pt-4">
          <StepDot active={step >= 1} />
          <StepDot active={step >= 2} />
          <StepDot active={step >= 3} />
        </div>
        <div className="px-4 pb-3 text-[11px] font-black text-app-muted">
          STEP {step} / 3 · {getStepDescription(step)}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {step === 1 && (
            <div>
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                이벤트
              </div>
              <div className="space-y-3">
                <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
                  <FieldLabel>이벤트 제목 *</FieldLabel>
                  <input
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                    }}
                    placeholder="예: 2026 Vision Trip"
                    className="mt-1 w-full bg-transparent text-base font-black outline-none placeholder:text-slate-300"
                  />
                </label>
                <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
                  <FieldLabel>행사 일정</FieldLabel>
                  <input
                    type="date"
                    value={scheduledAt}
                    onChange={(event) => {
                      setScheduledAt(event.target.value);
                    }}
                    className="mt-1 w-full bg-transparent text-sm font-bold outline-none text-app-ink"
                  />
                  {!scheduledAt && (
                    <span className="mt-1 block text-xs font-bold text-slate-300">
                      날짜를 선택해주세요
                    </span>
                  )}
                  {scheduledAt && (
                    <span className="mt-1 block text-xs font-black text-app-muted">
                      {formatKoreanDate(scheduledAt)}
                    </span>
                  )}
                </label>
              </div>

              <div className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                사용 방식
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
                {(Object.keys(useModeLabels) as EventUseMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setUseMode(mode);
                    }}
                    className={
                      useMode === mode
                        ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm"
                        : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"
                    }
                  >
                    {useModeLabels[mode]}
                  </button>
                ))}
              </div>
              {useMode === "attached" && (
                <div className="mt-3 space-y-3">
                  <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
                    <FieldLabel>연결할 행사명</FieldLabel>
                    <input
                      value={externalTitle}
                      onChange={(event) => {
                        setExternalTitle(event.target.value);
                      }}
                      placeholder="예: 춘천 국제태권도대회"
                      className="mt-1 w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-300"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
                      <FieldLabel>브랜드/주최</FieldLabel>
                      <input
                        value={externalBrandName}
                        onChange={(event) => {
                          setExternalBrandName(event.target.value);
                        }}
                        placeholder="예: U-Edutainment"
                        className="mt-1 w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-300"
                      />
                    </label>
                    <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
                      <FieldLabel>행사 링크</FieldLabel>
                      <input
                        value={externalUrl}
                        onChange={(event) => {
                          setExternalUrl(event.target.value);
                        }}
                        inputMode="url"
                        placeholder="https://..."
                        className="mt-1 w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-300"
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                운영팀 연락처
              </div>
              <div className="space-y-3">
                <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
                  <FieldLabel>이름 *</FieldLabel>
                  <input
                    value={organizerName}
                    onChange={(event) => {
                      setOrganizerName(event.target.value);
                    }}
                    placeholder="예: 김운영"
                    className="mt-1 w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-300"
                  />
                </label>
                <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
                  <FieldLabel>역할</FieldLabel>
                  <input
                    value={organizerRole}
                    onChange={(event) => {
                      setOrganizerRole(event.target.value);
                    }}
                    placeholder="예: 행사 진행 담당"
                    className="mt-1 w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-300"
                  />
                </label>
                <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
                  <FieldLabel>전화번호 *</FieldLabel>
                  <input
                    value={organizerPhone}
                    onChange={(event) => {
                      setOrganizerPhone(event.target.value);
                    }}
                    inputMode="tel"
                    placeholder="010-1234-5678"
                    className="mt-1 w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-300"
                  />
                </label>
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
                  {([
                    ["sms-first", "문자 우선"],
                    ["call-first", "전화 우선"],
                  ] as Array<[ContactPreference, string]>).map(([preference, label]) => (
                    <button
                      key={preference}
                      type="button"
                      onClick={() => {
                        setContactPreference(preference);
                      }}
                      className={
                        contactPreference === preference
                          ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm"
                          : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                결과물 방식
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
                {(Object.keys(outputModeLabels) as OutputMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setOutputMode(mode);
                    }}
                    className={
                      outputMode === mode
                        ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm"
                        : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"
                    }
                  >
                    {outputModeLabels[mode]}
                  </button>
                ))}
              </div>
              <div className="mt-2 rounded-2xl border border-app-border bg-white px-4 py-3 text-xs font-bold leading-5 text-app-muted">
                {outputMode === "collage"
                  ? "팀마다 같은 장수를 배치해 최종 콜라주 PNG를 만듭니다."
                  : "칸 수 계산 없이 장소별 사진을 모으고 ZIP, 갤러리, 투표 순위 중심으로 운영합니다."}
              </div>

              {outputMode === "collage" && (
                <>
                  <div className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                    콜라주 구조
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
                      <FieldLabel>가로 칸</FieldLabel>
                      <input
                        type="number"
                        min={1}
                        value={cols}
                        onChange={(event) => {
                          setCols(numberFromInput(event.target.value, cols));
                        }}
                        className="mt-1 w-full bg-transparent text-base font-black outline-none"
                      />
                    </label>
                    <label className="block rounded-2xl border border-app-border bg-white px-4 py-3">
                      <FieldLabel>세로 칸</FieldLabel>
                      <input
                        type="number"
                        min={1}
                        value={rows}
                        onChange={(event) => {
                          setRows(numberFromInput(event.target.value, rows));
                        }}
                        className="mt-1 w-full bg-transparent text-base font-black outline-none"
                      />
                    </label>
                  </div>
                </>
              )}
              <label className="mt-3 block rounded-2xl border border-app-border bg-white px-4 py-3">
                <FieldLabel>참여 팀 수</FieldLabel>
                <input
                  type="number"
                  min={1}
                  value={teamCount}
                  onChange={(event) => {
                    setTeamCount(numberFromInput(event.target.value, teamCount));
                  }}
                  className="mt-1 w-full bg-transparent text-base font-black outline-none"
                />
              </label>

              {outputMode === "collage" ? (
                <div className="mt-4 rounded-panel bg-app-ink p-5 text-white">
                  <div className="text-4xl font-black tracking-normal">{totalSlots}칸</div>
                  <div className="mt-1 text-xs font-black text-slate-400">총 슬롯 · 자동 계산</div>
                  <div className="mt-4 border-t border-slate-700 pt-4 text-sm font-bold leading-6 text-slate-300">
                    {cols} × {rows} 칸 = {totalSlots}칸 ÷ {teamCount}팀 ={" "}
                    <b className="text-white">{perTeamCount ?? "계산 불가"}</b>
                    {perTeamCount ? "장" : ""}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-panel bg-app-ink p-5 text-white">
                  <div className="text-3xl font-black tracking-normal">사진 수집</div>
                  <div className="mt-1 text-xs font-black text-slate-400">팀 수 고정 · 장소별 목표만 사용</div>
                  <div className="mt-4 border-t border-slate-700 pt-4 text-sm font-bold leading-6 text-slate-300">
                    {teamCount}팀이 장소별로 자유롭게 업로드합니다. 최종 결과는 ZIP, 갤러리, 투표 순위 중심으로 정리됩니다.
                  </div>
                </div>
              )}

              {outputMode === "collage" && perTeamCount === null && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
                  <p className="font-black">팀 수에 맞춰 칸 수를 조정해야 합니다.</p>
                  {collageFit.recommended && (
                    <p className="mt-1">
                      추천: {collageFit.recommended.grid.cols}×{collageFit.recommended.grid.rows} = {collageFit.recommended.totalSlots}칸,
                      팀당 {collageFit.recommended.perTeamCount}장
                    </p>
                  )}
                  <div className="mt-3 grid gap-2">
                    {collageFit.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => applyFitOption(option)}
                        className="rounded-xl bg-white px-3 py-2 text-left text-xs font-black text-amber-900 shadow-sm"
                      >
                        {option.label}: {option.grid.cols}×{option.grid.rows} = {option.totalSlots}칸
                        <span className="ml-1 text-amber-700">
                          ({option.delta > 0 ? `${option.delta}칸 추가` : `${Math.abs(option.delta)}칸 제외`})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                첫 입장 모드
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
                {(Object.keys(selfieModeLabels) as SelfieMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setSelfieMode(mode);
                    }}
                    className={
                      selfieMode === mode
                        ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm"
                        : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"
                    }
                  >
                    {selfieModeLabels[mode]}
                  </button>
                ))}
              </div>

              <div className="mb-2 mt-5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                행사 후 투표
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
                {([
                  [false, "사용 안 함"],
                  [true, "사용"],
                ] as Array<[boolean, string]>).map(([enabled, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setVotingEnabled(enabled)}
                    className={
                      votingEnabled === enabled
                        ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm"
                        : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {votingEnabled && (
                <div className="mt-3 space-y-3">
                  <div>
                    <FieldLabel>투표 대상</FieldLabel>
                    <div className="mt-1 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1">
                      {(Object.keys(votingTargetLabels) as VotingTarget[]).map((target) => (
                        <button
                          key={target}
                          type="button"
                          onClick={() => setVotingTarget(target)}
                          className={
                            votingTarget === target
                              ? "rounded-xl bg-white px-2 py-2 text-[11px] font-black shadow-sm"
                              : "rounded-xl px-2 py-2 text-[11px] font-black text-app-muted"
                          }
                        >
                          {votingTargetLabels[target]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <FieldLabel>순위 반영</FieldLabel>
                    <div className="mt-1 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
                      {(Object.keys(votingResultModeLabels) as VotingResultMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setVotingResultMode(mode)}
                          className={
                            votingResultMode === mode
                              ? "rounded-xl bg-white px-2 py-2 text-xs font-black shadow-sm"
                              : "rounded-xl px-2 py-2 text-xs font-black text-app-muted"
                          }
                        >
                          {votingResultModeLabels[mode]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <button
                type="button"
                onClick={openNewPlace}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                장소 추가
              </button>

              {places.length === 0 && (
                <section className="card mb-4 p-5 text-center">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-app-muted">
                    <MapPin className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h2 className="font-black">장소를 추가해주세요</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-app-muted">
                    {outputMode === "collage"
                      ? `팀당 ${perTeamCount ?? 0}장을 장소별로 나누면 다음 단계로 갈 수 있습니다.`
                      : "장소별 목표 사진 수를 정하면 팀원들이 자유롭게 업로드할 수 있습니다."}
                  </p>
                </section>
              )}

              <div className="space-y-3">
                {places.map((place, index) => (
                  <section key={place.id} className="card p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="grid h-12 w-12 flex-none place-items-center rounded-2xl text-white"
                        style={{
                          background: `linear-gradient(135deg, ${placeColors[index % placeColors.length]}, #bbf7d0)`,
                        }}
                      >
                        <Image className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-sm font-black">{place.name}</h2>
                        <p className="mt-1 truncate text-xs font-bold text-app-muted">
                          {place.verifyHint || place.description || "인증 조건 없음"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700">
                            팀당 {place.perTeamCount}장
                          </span>
                          {place.mapUrl && place.mapPlatform && (
                            <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-700">
                              {mapPlatformLabels[place.mapPlatform]}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlace(place);
                          setModalOpen(true);
                        }}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-app-muted"
                        aria-label="장소 편집"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </section>
                ))}
              </div>

              <div
                className={
                  stepTwoValid
                    ? "mt-4 flex items-center justify-between rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-700"
                    : "mt-4 flex items-center justify-between rounded-2xl bg-amber-100 px-4 py-3 text-sm font-black text-amber-800"
                }
              >
                <span>팀당 분배 합계</span>
                <span>
                  {outputMode === "collage" ? `${placeTotal} / ${perTeamCount ?? 0}` : `${placeTotal}장 목표`}
                  {stepTwoValid ? " ✓" : ""}
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <section className="mb-4 rounded-panel bg-app-ink p-5 text-white">
                <div className="text-xs font-black text-slate-400">이벤트</div>
                <h2 className="mt-1 text-2xl font-black tracking-normal">{title || "새 이벤트"}</h2>
                <p className="mt-3 text-xs font-bold text-slate-300">
                  {teamCount}팀 · {outputMode === "collage" ? `${totalSlots}칸` : `팀당 ${placeTotal}장 목표`} · {places.length}개 장소
                  {scheduledAt ? ` · ${formatKoreanDate(scheduledAt)}` : ""}
                </p>
                {useMode === "attached" && (externalTitle || externalBrandName) && (
                  <p className="mt-2 text-xs font-black text-blue-100">
                    연결 행사: {[externalTitle, externalBrandName].filter(Boolean).join(" · ")}
                  </p>
                )}
              </section>

              <section className="card mb-4 p-4">
                <h2 className="mb-3 text-sm font-black">
                  한 팀의 {effectivePerTeamCount ?? 0}장 {outputMode === "collage" ? "구조" : "목표"}
                </h2>
                <div className="mb-3 flex h-10 overflow-hidden rounded-xl">
                  {places.map((place, index) => (
                    <div
                      key={place.id}
                      className="grid min-w-0 place-items-center px-1 text-[10px] font-black text-white"
                      style={{
                        flex: place.perTeamCount,
                        background: placeColors[index % placeColors.length],
                      }}
                    >
                      {place.name} {place.perTeamCount}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {places.map((place, index) => (
                    <span key={place.id} className="inline-flex items-center gap-1 text-[11px] font-bold text-app-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: placeColors[index % placeColors.length] }}
                      />
                      {place.name}
                    </span>
                  ))}
                </div>
              </section>

              {outputMode === "collage" ? (
                <>
                  <h2 className="mb-2 text-sm font-black">최종 보드 ({cols} × {rows})</h2>
                  <div
                    className="mb-4 grid gap-0.5 rounded-2xl bg-slate-200 p-2"
                    style={{ gridTemplateColumns: `repeat(${Math.min(cols, 18)}, minmax(0, 1fr))` }}
                  >
                    {previewCells.map((cell) => (
                      <div key={cell} className="aspect-square rounded-[3px] bg-white" />
                    ))}
                  </div>
                  {previewCells.length < totalSlots && (
                    <p className="mb-4 text-center text-xs font-bold text-app-muted">
                      화면 미리보기는 앞 {previewCells.length}칸만 표시합니다.
                    </p>
                  )}
                </>
              ) : (
                <section className="card mb-4 p-4">
                  <h2 className="text-sm font-black">사진 수집 결과</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-app-muted">
                    업로드 사진은 장소별 갤러리와 원본 ZIP으로 정리됩니다. 투표를 켜면 Export 화면에서 순위까지 확인할 수 있습니다.
                  </p>
                </section>
              )}

              <div className="rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-bold leading-6 text-app-muted">
                만들기를 누르면 팀 {teamCount}개와 슬롯 {teamCount * (effectivePerTeamCount ?? 0)}칸이 자동 생성되고, 각 팀에
                랜덤 토큰이 발급됩니다. 팀장 연락처는 생성 직후 팀 QR 관리에서 등록합니다.
                {votingEnabled ? " 투표는 Export 화면에서 행사 후 열 수 있습니다." : ""}
              </div>

              {createError && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
                  {createError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-app-border bg-white p-4">
          {step === 1 && (
            <button
              type="button"
              onClick={() => {
                setStep(2);
              }}
              disabled={!stepOneValid}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white disabled:opacity-40"
            >
              다음 · 장소 설정
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={() => {
                setStep(3);
              }}
              disabled={!stepTwoValid}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white disabled:opacity-40"
            >
              다음 · 미리보기
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={() => {
                void handleCreateEvent();
              }}
              disabled={!canCreate}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white disabled:opacity-40"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              {creating ? "이벤트 만드는 중" : "이벤트 만들기"}
            </button>
          )}
        </div>
      </section>

      {modalOpen && (
        <PlaceEditModal
          initialPlace={editingPlace}
          eventId={draftEventId}
          onClose={() => {
            setModalOpen(false);
            setEditingPlace(undefined);
          }}
          onDelete={editingPlace ? handleDeletePlace : undefined}
          onSave={handleSavePlace}
        />
      )}
    </main>
  );
}
