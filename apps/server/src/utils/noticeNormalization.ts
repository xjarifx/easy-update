const monthIndexByShortName: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

const parseNoticeDateParts = (value: string) => {
  const trimmed = value.trim();
  const currentYear = new Date().getFullYear();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const dmyShortMonthMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);

  if (dmyShortMonthMatch) {
    const shortMonth = dmyShortMonthMatch[2].toUpperCase();
    const monthIndex = monthIndexByShortName[shortMonth];

    if (monthIndex !== undefined) {
      return {
        year: Number(dmyShortMonthMatch[3]),
        month: monthIndex + 1,
        day: Number(dmyShortMonthMatch[1]),
      };
    }
  }

  const dmyNumericMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (dmyNumericMatch) {
    return {
      year: Number(dmyNumericMatch[3]),
      month: Number(dmyNumericMatch[2]),
      day: Number(dmyNumericMatch[1]),
    };
  }

  const ymdSlashMatch = trimmed.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);

  if (ymdSlashMatch) {
    return {
      year: Number(ymdSlashMatch[1]),
      month: Number(ymdSlashMatch[2]),
      day: Number(ymdSlashMatch[3]),
    };
  }

  const verboseMonthMatch = trimmed.match(
    /^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/,
  );

  if (verboseMonthMatch) {
    const shortMonth = verboseMonthMatch[1].slice(0, 3).toUpperCase();
    const monthIndex = monthIndexByShortName[shortMonth];

    if (monthIndex !== undefined) {
      return {
        year: Number(verboseMonthMatch[3]),
        month: monthIndex + 1,
        day: Number(verboseMonthMatch[2]),
      };
    }
  }

  const monthDayWithoutYearMatch = trimmed.match(
    /^([A-Za-z]{3,9})\s+(\d{1,2})$/,
  );

  if (monthDayWithoutYearMatch) {
    const shortMonth = monthDayWithoutYearMatch[1].slice(0, 3).toUpperCase();
    const monthIndex = monthIndexByShortName[shortMonth];

    if (monthIndex !== undefined) {
      const month = monthIndex + 1;
      const day = Number(monthDayWithoutYearMatch[2]);

      if (isValidDateParts(currentYear, month, day)) {
        const candidate = new Date(currentYear, month - 1, day);
        const today = new Date();
        const todayStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        );

        return {
          year: candidate < todayStart ? currentYear + 1 : currentYear,
          month,
          day,
        };
      }
    }
  }

  return null;
};

const parseNoticeTimeParts = (value: string) => {
  const normalized = value.trim().toUpperCase();
  const twentyFourHourSecondsMatch = normalized.match(
    /^(\d{1,2}):(\d{2}):(\d{2})$/,
  );

  if (twentyFourHourSecondsMatch) {
    return {
      hours: Number(twentyFourHourSecondsMatch[1]),
      minutes: Number(twentyFourHourSecondsMatch[2]),
    };
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    return {
      hours: Number(twentyFourHourMatch[1]),
      minutes: Number(twentyFourHourMatch[2]),
    };
  }

  const meridiemMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);

  const meridiemSecondsMatch = normalized.match(
    /^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/,
  );

  if (meridiemSecondsMatch) {
    const rawHours = Number(meridiemSecondsMatch[1]);
    const minutes = Number(meridiemSecondsMatch[2]);
    const meridiem = meridiemSecondsMatch[4];

    if (rawHours < 1 || rawHours > 12) {
      return null;
    }

    const hours = (rawHours % 12) + (meridiem === "PM" ? 12 : 0);
    return { hours, minutes };
  }

  if (!meridiemMatch) {
    return null;
  }

  const rawHours = Number(meridiemMatch[1]);
  const minutes = Number(meridiemMatch[2]);
  const meridiem = meridiemMatch[3];

  if (rawHours < 1 || rawHours > 12) {
    return null;
  }

  const hours = (rawHours % 12) + (meridiem === "PM" ? 12 : 0);

  return { hours, minutes };
};

const isValidDateParts = (year: number, month: number, day: number) => {
  if (year < 0 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
};

export const toCanonicalNoticeDate = (value: string) => {
  const parsed = parseNoticeDateParts(value);

  if (!parsed) {
    return null;
  }

  const { year, month, day } = parsed;

  if (!isValidDateParts(year, month, day)) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
};

export const toCanonicalNoticeTime = (value: string) => {
  if (value.trim().toLowerCase() === "no time") {
    return "no time";
  }

  const parsed = parseNoticeTimeParts(value);

  if (!parsed) {
    return null;
  }

  const { hours, minutes } = parsed;

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};
