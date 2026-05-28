import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import {
  createEvent,
  getPerTeamCount,
  type CreateEventPlaceInput,
} from "../lib/createEvent";
import { useAuth } from "../lib/auth";
import { sanitizePhone } from "../lib/phone";
import type { ContactPreference, MapPlatform, SelfieMode } from "../lib/types";

type WizardStep = 1 | 2 | 3 | 4;

interface TeamLeaderInput {
  name: string;
  phone: string;
}

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

function createLeaderInputs(teamCount: number, currentLeaders: TeamLeaderInput[] = []): TeamLeaderInput[] {
  return Array.from({ length: teamCount }, (_, index) => currentLeaders[index] ?? { name: "", phone: "" });
}

function getStepTitle(step: WizardStep): string {
  if (step === 1) {
    return "새 이벤트";
  }

  if (step === 2) {
    return "장소 · 분배";
  }

  if (step === 3) {
    return "팀장 등록";
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

  if (step === 3) {
    return "비상 연락망";
  }

  return "만들기 직전 확인";
}

export function EventCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerRole, setOrganizerRole] = useState("");
  const [organizerPhone, setOrganizerPhone] = useState("");
  const [contactPreference, setContactPreference] = useState<ContactPreference>("sms-first");
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [teamCount, setTeamCount] = useState(10);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderInput[]>(() => createLeaderInputs(10));
  const [selfieMode, setSelfieMode] = useState<SelfieMode>("individual");
  const [places, setPlaces] = useState<CreateEventPlaceInput[]>([]);
  const [editingPlace, setEditingPlace] = useState<CreateEventPlaceInput | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const grid = useMemo(() => ({ rows, cols }), [cols, rows]);
  const totalSlots = rows * cols;
  const perTeamCount = getPerTeamCount(grid, teamCount);
  const placeTotal = places.reduce((sum, place) => sum + place.perTeamCount, 0);
  const stepOneValid =
    title.trim().length > 0 &&
    organizerName.trim().length > 0 &&
    sanitizePhone(organizerPhone).length > 0 &&
    perTeamCount !== null;
  const stepTwoValid =
    perTeamCount !== null &&
    places.length > 0 &&
    placeTotal === perTeamCount &&
    places.every((place) => place.name.trim().length > 0 && place.perTeamCount > 0);
  const stepThreeValid = teamLeaders.every(
    (leader) => leader.name.trim().length > 0 && sanitizePhone(leader.phone).length > 0,
  );
  const canCreate = stepOneValid && stepTwoValid && stepThreeValid && !creating;
  const previewCells = Array.from({ length: Math.min(totalSlots, 144) }, (_, index) => index);

  useEffect(() => {
    setTeamLeaders((currentLeaders) => createLeaderInputs(teamCount, currentLeaders));
  }, [teamCount]);

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
        ownerId: user.uid,
        title,
        subtitle,
        organizer: {
          name: organizerName,
          role: organizerRole,
          phone: organizerPhone,
          contactPreference,
        },
        grid,
        teamCount,
        leaders: teamLeaders.map((leader, index) => ({
          teamIndex: index + 1,
          name: leader.name,
          phone: leader.phone,
        })),
        places,
        selfieMode,
      });
      navigate(`/events/${eventId}`, { replace: true });
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
          <StepDot active={step >= 4} />
        </div>
        <div className="px-4 pb-3 text-[11px] font-black text-app-muted">
          STEP {step} / 4 · {getStepDescription(step)}
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
                    value={subtitle}
                    onChange={(event) => {
                      setSubtitle(event.target.value);
                    }}
                    placeholder="예: 2026.06.21 (토)"
                    className="mt-1 w-full bg-transparent text-sm font-bold outline-none placeholder:text-slate-300"
                  />
                </label>
              </div>

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

              <div className="mt-4 rounded-panel bg-app-ink p-5 text-white">
                <div className="text-4xl font-black tracking-normal">{totalSlots}칸</div>
                <div className="mt-1 text-xs font-black text-slate-400">총 슬롯 · 자동 계산</div>
                <div className="mt-4 border-t border-slate-700 pt-4 text-sm font-bold leading-6 text-slate-300">
                  {cols} × {rows} 칸 = {totalSlots}칸 ÷ {teamCount}팀 ={" "}
                  <b className="text-white">{perTeamCount ?? "계산 불가"}</b>
                  {perTeamCount ? "장" : ""}
                </div>
              </div>

              {perTeamCount === null && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-800">
                  팀 수가 그리드 전체 칸 수의 약수여야 합니다.
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
                    팀당 {perTeamCount ?? 0}장을 장소별로 나누면 다음 단계로 갈 수 있습니다.
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
                  {placeTotal} / {perTeamCount ?? 0}
                  {stepTwoValid ? " ✓" : ""}
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <section className="mb-4 rounded-panel bg-app-ink p-5 text-white">
                <div className="text-xs font-black text-slate-400">비상 연락망</div>
                <h2 className="mt-1 text-2xl font-black tracking-normal">
                  팀장 {teamCount}명을 알려주세요
                </h2>
                <p className="mt-3 text-xs font-bold leading-5 text-slate-300">
                  행사 중 운영자가 바로 연락할 수 있도록 각 팀장 이름과 전화번호를 필수로 입력합니다.
                </p>
              </section>

              <div className="space-y-3">
                {teamLeaders.map((leader, index) => (
                  <section key={index} className="card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-app-ink text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <h2 className="text-sm font-black">{index + 1}팀 팀장</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block rounded-2xl border border-app-border bg-white px-3 py-2.5">
                        <FieldLabel>이름 *</FieldLabel>
                        <input
                          value={leader.name}
                          onChange={(event) => {
                            const nextName = event.target.value;
                            setTeamLeaders((currentLeaders) =>
                              currentLeaders.map((currentLeader, leaderIndex) =>
                                leaderIndex === index ? { ...currentLeader, name: nextName } : currentLeader,
                              ),
                            );
                          }}
                          placeholder="예: 박팀장"
                          className="mt-1 w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-300"
                        />
                      </label>
                      <label className="block rounded-2xl border border-app-border bg-white px-3 py-2.5">
                        <FieldLabel>전화 *</FieldLabel>
                        <input
                          value={leader.phone}
                          onChange={(event) => {
                            const nextPhone = event.target.value;
                            setTeamLeaders((currentLeaders) =>
                              currentLeaders.map((currentLeader, leaderIndex) =>
                                leaderIndex === index ? { ...currentLeader, phone: nextPhone } : currentLeader,
                              ),
                            );
                          }}
                          inputMode="tel"
                          placeholder="010-1234-5678"
                          className="mt-1 w-full bg-transparent text-sm font-black outline-none placeholder:text-slate-300"
                        />
                      </label>
                    </div>
                  </section>
                ))}
              </div>

              {!stepThreeValid && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-800">
                  모든 팀의 팀장 이름과 전화번호를 입력하면 다음 단계로 갈 수 있습니다.
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <section className="mb-4 rounded-panel bg-app-ink p-5 text-white">
                <div className="text-xs font-black text-slate-400">이벤트</div>
                <h2 className="mt-1 text-2xl font-black tracking-normal">{title || "새 이벤트"}</h2>
                <p className="mt-3 text-xs font-bold text-slate-300">
                  {teamCount}팀 · {totalSlots}칸 · {places.length}개 장소
                  {subtitle ? ` · ${subtitle}` : ""}
                </p>
              </section>

              <section className="card mb-4 p-4">
                <h2 className="mb-3 text-sm font-black">한 팀의 {perTeamCount}장 구조</h2>
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

              <div className="rounded-2xl border border-app-border bg-white px-4 py-3 text-sm font-bold leading-6 text-app-muted">
                만들기를 누르면 팀 {teamCount}개와 슬롯 {totalSlots}칸이 자동 생성되고, 각 팀에
                랜덤 토큰이 발급됩니다.
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
              다음 · 팀장 등록
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={() => {
                setStep(4);
              }}
              disabled={!stepThreeValid}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-app-ink px-4 py-4 text-sm font-black text-white disabled:opacity-40"
            >
              다음 · 미리보기
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          {step === 4 && (
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
