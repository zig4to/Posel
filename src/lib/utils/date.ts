// Pomožne funkcije za mesečno mrežo koledarja.
// Pozor: povsod uporabljamo lokalne komponente datuma (getFullYear/getMonth/getDate),
// nikoli toISOString(), da se izognemo premiku dneva zaradi časovnega pasu.

export const SLOVENIAN_MONTHS = [
  "Januar",
  "Februar",
  "Marec",
  "April",
  "Maj",
  "Junij",
  "Julij",
  "Avgust",
  "September",
  "Oktober",
  "November",
  "December",
] as const;

// Ponedeljek je prvi dan tedna (slovenska konvencija).
export const SLOVENIAN_WEEKDAYS_SHORT = [
  "Pon",
  "Tor",
  "Sre",
  "Čet",
  "Pet",
  "Sob",
  "Ned",
] as const;

export type CalendarDay = {
  date: Date;
  dateKey: string; // "YYYY-MM-DD", lokalni datum
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Formatira Date v "YYYY-MM-DD" po LOKALNEM času (ne UTC). */
export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Ponedeljek=0 ... Nedelja=6 (JS getDay() vrne Nedelja=0 ... Sobota=6)
function mondayFirstWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Vrne 6x7 (42) dni mrežo za dani mesec, vključno z vodilnimi/sledečimi
 * dnevi sosednjih mesecev, da mreža vedno zapolni cele tedne.
 */
export function getMonthGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const leadingDays = mondayFirstWeekday(firstOfMonth);
  const gridStart = new Date(year, month, 1 - leadingDays);

  const today = new Date();
  const days: CalendarDay[] = [];

  for (let i = 0; i < 42; i++) {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    const weekday = date.getDay(); // Nedelja=0 ... Sobota=6
    days.push({
      date,
      dateKey: formatDateKey(date),
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameDay(date, today),
      isWeekend: weekday === 0 || weekday === 6,
    });
  }

  return days;
}

/** Prvi in zadnji dan meseca kot "YYYY-MM-DD" (za Supabase range poizvedbo). */
export function getMonthRange(
  year: number,
  month: number
): { from: string; to: string } {
  const from = formatDateKey(new Date(year, month, 1));
  const to = formatDateKey(new Date(year, month + 1, 0));
  return { from, to };
}

/** Formatira uro "HH:MM:SS" ali "HH:MM" v "HH:MM" za prikaz. */
export function formatTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

export function formatFullDate(date: Date): string {
  const weekday = SLOVENIAN_WEEKDAYS_SHORT[mondayFirstWeekday(date)];
  return `${weekday}, ${date.getDate()}. ${
    SLOVENIAN_MONTHS[date.getMonth()]
  } ${date.getFullYear()}`;
}
