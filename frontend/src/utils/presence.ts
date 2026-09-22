import { getVisitorId } from './visitorId';

export function sendPresenceHeartbeat(): Promise<number | null> {
    return fetch('/api/users/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: getVisitorId() }),
    })
        .then(res => (res.ok ? res.json() : null))
        .then(data => (data && typeof data.count === 'number' ? data.count : null))
        .catch(() => null);
}
