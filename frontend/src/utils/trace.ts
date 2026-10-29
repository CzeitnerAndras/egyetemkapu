export function newTraceparent(): string {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `00-${hex.slice(0, 32)}-${hex.slice(32, 48)}-01`;
}

export function withTrace(init: RequestInit = {}): RequestInit {
    const headers = new Headers(init.headers);
    if (!headers.has('traceparent')) {
        headers.set('traceparent', newTraceparent());
    }
    return { ...init, headers };
}
