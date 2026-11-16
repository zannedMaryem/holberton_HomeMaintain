import type { JobTimeSlot } from "../models/Problem";

export const JOB_TIME_SLOTS: ReadonlyArray<{
  id: JobTimeSlot;
  label: string;
  startsAtMinute: number;
}> = [
  { id: "morning", label: "8:00 AM - 12:00 PM", startsAtMinute: 8 * 60 },
  // The afternoon window starts after the one-hour midday break.
  { id: "afternoon", label: "1:00 PM - 5:00 PM", startsAtMinute: 13 * 60 },
];

const TUNISIA_TIME_ZONE = "Africa/Tunis";

export const isJobTimeSlot = (value: unknown): value is JobTimeSlot =>
  value === "morning" || value === "afternoon";

const getTunisiaDateParts = (date: Date): Record<string, string> =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TUNISIA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map(({ type, value }) => [type, value]),
  );

export const isValidJobDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
};

export const isJobDateBeforeToday = (
  date: string,
  now: Date = new Date(),
): boolean => {
  const today = getTunisiaDateParts(now);
  return date < `${today.year}-${today.month}-${today.day}`;
};

export const getAvailableJobTimeSlots = (
  date: string,
  bookedSlots: ReadonlySet<JobTimeSlot>,
  now: Date = new Date(),
) => {
  const today = getTunisiaDateParts(now);
  const todayString = `${today.year}-${today.month}-${today.day}`;
  const currentMinute = Number(today.hour) * 60 + Number(today.minute);

  return JOB_TIME_SLOTS.filter(({ id, startsAtMinute }) => {
    if (bookedSlots.has(id)) return false;
    return date !== todayString || startsAtMinute > currentMinute;
  }).map(({ id, label }) => ({ id, label }));
};
