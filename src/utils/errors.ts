export function formatReadableError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (!raw) return fallback;

  let extracted = raw;
  try {
    if (raw.trim().startsWith('{')) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        extracted = parsed.error;
        if (
          parsed.authInfo &&
          parsed.authInfo.emailVerified === false &&
          extracted.toLowerCase().includes('permission')
        ) {
          return 'يجب توثيق البريد الإلكتروني لحسابك قبل إجراء هذه العملية.';
        }
      }
    }
  } catch {
    // Not JSON, use raw string
  }

  const lower = extracted.toLowerCase();
  if (lower.includes('quota exceeded')) {
    return 'تم تجاوز حصة الاستخدام المجانية لقاعدة البيانات مؤقتاً، يرجى المحاولة لاحقاً.';
  }
  if (lower.includes('missing or insufficient permissions') || lower.includes('permission-denied')) {
    return 'تعذر تنفيذ العملية بسبب قيود الصلاحيات. تأكد من تسجيل الدخول بحساب Google موثق والمحاولة مجدداً.';
  }
  if (lower.includes('client is offline') || lower.includes('network') || lower.includes('unavailable')) {
    return 'تعذر الاتصال بقاعدة البيانات. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.';
  }

  // If it's already a readable Arabic message, return it as-is
  if (/[\u0600-\u06FF]/.test(extracted)) {
    return extracted;
  }

  return fallback;
}
