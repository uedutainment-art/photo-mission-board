export function sanitizePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return digits ? `+${digits}` : "";
  }

  return digits;
}

export function formatPhone(phone: string | undefined): string {
  if (!phone) {
    return "";
  }

  const sanitized = sanitizePhone(phone);

  if (sanitized.startsWith("+82")) {
    const local = `0${sanitized.slice(3)}`;

    if (local.length === 11) {
      return `+82 ${local.slice(1, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
    }

    return sanitized;
  }

  if (sanitized.length === 11) {
    return `${sanitized.slice(0, 3)}-${sanitized.slice(3, 7)}-${sanitized.slice(7)}`;
  }

  if (sanitized.length === 10) {
    return `${sanitized.slice(0, 3)}-${sanitized.slice(3, 6)}-${sanitized.slice(6)}`;
  }

  return sanitized;
}

export function telHref(phone: string): string {
  return `tel:${sanitizePhone(phone)}`;
}

export function smsHref(phone: string, body?: string): string {
  const sanitized = sanitizePhone(phone);

  if (!body) {
    return `sms:${sanitized}`;
  }

  return `sms:${sanitized}?body=${encodeURIComponent(body)}`;
}
