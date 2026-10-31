import { toolFetch, toolIsDown } from './toolFetch';

describe('toolFetch', () => {
    it('treats server failures as the tool being down', () => {
        expect(toolIsDown(500)).toBe(true);
        expect(toolIsDown(503)).toBe(true);
        expect(toolIsDown(400)).toBe(false);
        expect(toolIsDown(429)).toBe(false);
    });

    it('sends the request with a timeout signal', async () => {
        globalThis.fetch = jest.fn();
        (globalThis.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

        await toolFetch('/api/points/health');

        const init = (globalThis.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
        expect(init.signal).toBeInstanceOf(AbortSignal);
        expect((init.headers as Headers).get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    });
});
