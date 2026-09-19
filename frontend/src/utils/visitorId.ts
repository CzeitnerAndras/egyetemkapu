const STORAGE_KEY = 'ek-visitor-id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getVisitorId(): string {
    try {
        const existing = localStorage.getItem(STORAGE_KEY);
        if (existing && UUID_PATTERN.test(existing)) {
            return existing;
        }
    } catch {
        // localStorage may be unavailable
    }

    const visitorId = crypto.randomUUID();
    try {
        localStorage.setItem(STORAGE_KEY, visitorId);
    } catch {
        // Ignore quota / private-mode failures; a new id is generated next time.
    }
    return visitorId;
}
