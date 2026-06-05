export function formatIST(timestamp, dateOnly = false) {
  if (!timestamp) return 'Recently';
  try {
    const ts = timestamp.includes('+') || timestamp.includes('Z')
      ? timestamp
      : timestamp + 'Z'; // treat as UTC
    const date = new Date(ts);
    if (dateOnly) {
      return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    }
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch {
    return timestamp;
  }
}