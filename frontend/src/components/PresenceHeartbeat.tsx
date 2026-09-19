import { useEffect } from 'react';
import { sendPresenceHeartbeat } from '../utils/presence';

export const PRESENCE_HEARTBEAT_MS = 60_000;

export default function PresenceHeartbeat() {
    useEffect(() => {
        sendPresenceHeartbeat();
        const interval = window.setInterval(() => {
            sendPresenceHeartbeat();
        }, PRESENCE_HEARTBEAT_MS);
        return () => window.clearInterval(interval);
    }, []);

    return null;
}
