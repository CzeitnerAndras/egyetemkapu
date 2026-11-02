import { newTraceparent, withTrace } from './trace';

describe('trace', () => {
    it('w3c traceparent fejlécet állít össze', () => {
        const bytes = Uint8Array.from({ length: 24 }, (_, index) => index + 1);
        jest.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
            (array as Uint8Array).set(bytes);
            return array;
        });

        expect(newTraceparent()).toBe('00-0102030405060708090a0b0c0d0e0f10-1112131415161718-01');
    });

    it('traceparentet tesz a kérésre, és a többi beállítást meghagyja', () => {
        const init = withTrace({ method: 'POST', body: '{}' });

        expect(init.method).toBe('POST');
        expect(init.body).toBe('{}');
        expect(new Headers(init.headers).get('traceparent')).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    });

    it('a már megadott traceparentet nem írja felül', () => {
        const init = withTrace({ headers: { traceparent: '00-aa-bb-01', Accept: 'application/json' } });
        const headers = new Headers(init.headers);

        expect(headers.get('traceparent')).toBe('00-aa-bb-01');
        expect(headers.get('Accept')).toBe('application/json');
    });
});
