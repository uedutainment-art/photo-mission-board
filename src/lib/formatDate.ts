const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatKoreanDate(iso: string | undefined): string {
  if (!iso) {
    return "";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

  if (!match) {
    return iso;
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return iso;
  }

  return `${year}.${month}.${day} (${WEEKDAY_LABELS[date.getDay()]})`;
}
