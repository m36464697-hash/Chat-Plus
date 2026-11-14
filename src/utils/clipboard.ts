export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback to textarea copy below
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function extractRoomCodeFromInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Support pasting full invite URLs like https://.../?room=CP-XXXX-XXX
  const roomParamMatch = trimmed.match(/[?&]room=([a-zA-Z0-9\-]+)/i);
  const candidate = roomParamMatch ? roomParamMatch[1] : trimmed;

  return candidate
    .toUpperCase()
    .replace(/[^A-Z0-9\-]/g, '')
    .slice(0, 32);
}
