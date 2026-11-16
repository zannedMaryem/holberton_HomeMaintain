const TUNISIA_TIME_ZONE = "Africa/Tunis";
export const MAX_RENTAL_DATES_PER_BOOKING = 14;
export const MAX_RENTAL_DAYS_AHEAD = 90;
export const MAX_AVAILABILITY_RANGE_DAYS = 31;

export const isValidRentalDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
};

export const getTunisiaToday = (now: Date = new Date()): string => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TUNISIA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const addDaysToRentalDate = (date: string, days: number): string => {
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  parsedDate.setUTCDate(parsedDate.getUTCDate() + days);
  return parsedDate.toISOString().slice(0, 10);
};

export const isSelectableRentalDate = (
  value: unknown,
  now: Date = new Date(),
): value is string => {
  if (!isValidRentalDate(value)) return false;
  const today = getTunisiaToday(now);
  const lastAllowedDate = addDaysToRentalDate(today, MAX_RENTAL_DAYS_AHEAD);
  return value >= today && value <= lastAllowedDate;
};

export const isValidRentalDateSelection = (
  value: unknown,
  now: Date = new Date(),
): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.length <= MAX_RENTAL_DATES_PER_BOOKING &&
  value.every((date) => isSelectableRentalDate(date, now)) &&
  new Set(value).size === value.length;

export const isFutureRentalBooking = (
  dates: string[],
  now: Date = new Date(),
): boolean => {
  const today = getTunisiaToday(now);
  return dates.length > 0 && dates.every((date) => isValidRentalDate(date) && date > today);
};

export const isActiveRentalBooking = (
  status: "confirmed" | "cancelled" | undefined,
): boolean => status !== "cancelled";

export const isValidRentalAvailabilityRange = (
  from: unknown,
  to: unknown,
  now: Date = new Date(),
): from is string =>
  isSelectableRentalDate(from, now) &&
  isSelectableRentalDate(to, now) &&
  from <= to &&
  (Date.parse(`${to}T00:00:00.000Z`) -
    Date.parse(`${from}T00:00:00.000Z`)) /
    86_400_000 <
    MAX_AVAILABILITY_RANGE_DAYS;

export const isValidDailyPriceTnd = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value > 0 &&
  value <= 100_000 &&
  Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-7;

export const toMillimes = (priceTnd: number): number =>
  Math.round(priceTnd * 1000);

export const fromMillimes = (priceMillimes: number): number =>
  priceMillimes / 1000;
