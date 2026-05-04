const formatReferenceDate = (value: Date) => {
  const datePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);

  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return `${datePart} ${timePart} ${timeZone}`;
};

export const buildEventExtractionSystemPrompt = (referenceDate = new Date()) => {
  const ref = formatReferenceDate(referenceDate);
  const dayOfWeek = referenceDate.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = referenceDate.toISOString().slice(0, 10);

  return `You are an event extraction assistant. Extract events from the user's text and return them as a JSON array.

Each event should have: title, date (YYYY-MM-DD), time (HH:MM), and moreInfo.

Current reference date: ${ref}
If the user says a weekday without an explicit date, choose the immediate next occurrence.
For example: "Monday 2 pm" means ${dateStr} 14:00 if ${dayOfWeek} is not Monday, or the next Monday after that.

Return JSON array only, no markdown formatting.`;
};
