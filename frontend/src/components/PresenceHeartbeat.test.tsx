import { render, waitFor } from '@testing-library/react';
import PresenceHeartbeat, { PRESENCE_HEARTBEAT_MS } from './PresenceHeartbeat';

describe('PresenceHeartbeat', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ count: 3 }),
        });
        localStorage.clear();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('belépéskor és percenként küld egy heartbeatet ugyanazzal a visitorId-val', async () => {
        render(<PresenceHeartbeat />);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        });

        const firstBody = JSON.parse((globalThis.fetch as jest.Mock).mock.calls[0][1].body);
        expect((globalThis.fetch as jest.Mock).mock.calls[0][0]).toBe('/api/users/heartbeat');
        expect((globalThis.fetch as jest.Mock).mock.calls[0][1].method).toBe('POST');
        expect(firstBody.visitorId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );

        jest.advanceTimersByTime(PRESENCE_HEARTBEAT_MS);

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledTimes(2);
        });
        const secondBody = JSON.parse((globalThis.fetch as jest.Mock).mock.calls[1][1].body);
        expect(secondBody.visitorId).toBe(firstBody.visitorId);
    });
});
