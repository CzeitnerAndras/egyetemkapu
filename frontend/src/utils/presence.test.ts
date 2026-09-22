import { sendPresenceHeartbeat } from './presence';

jest.mock('./visitorId', () => ({
    getVisitorId: () => '11111111-1111-4111-8111-111111111111',
}));

describe('sendPresenceHeartbeat', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn();
        jest.clearAllMocks();
    });

    it('elküldi a visitorId-t, és visszaadja a count értéket', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ count: 7 }),
        });

        await expect(sendPresenceHeartbeat()).resolves.toBe(7);
        expect(globalThis.fetch).toHaveBeenCalledWith('/api/users/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId: '11111111-1111-4111-8111-111111111111' }),
        });
    });

    it('null-t ad, ha a válasz nem ok vagy nincs szám count', async () => {
        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ count: 3 }),
        });
        await expect(sendPresenceHeartbeat()).resolves.toBeNull();

        (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ count: '3' }),
        });
        await expect(sendPresenceHeartbeat()).resolves.toBeNull();
    });

    it('null-t ad hálózati hiba esetén', async () => {
        (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'));
        await expect(sendPresenceHeartbeat()).resolves.toBeNull();
    });
});
