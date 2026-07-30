export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

export const formatDuration = (minutes: number) => {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe} min`;
  if (safe < 24 * 60) {
    const hours = Math.floor(safe / 60);
    const remainder = safe % 60;
    return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
  }
  const days = Math.floor(safe / (24 * 60));
  return `${days} day${days === 1 ? "" : "s"}`;
};
