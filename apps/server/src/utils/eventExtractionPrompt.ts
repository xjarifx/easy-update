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

export const buildEventExtractionSystemPrompt = (referenceDate = new Date()) =>
