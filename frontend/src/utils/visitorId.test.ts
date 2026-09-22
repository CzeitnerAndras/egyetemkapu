import { getVisitorId } from './visitorId';

const STORAGE_KEY = 'ek-visitor-id';
const VALID_ID = '11111111-1111-4111-8111-111111111111';

describe('getVisitorId', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.restoreAllMocks();
    });

    it('visszaadja és újra felhasználja a tárolt érvényes UUID-t', () => {
        localStorage.setItem(STORAGE_KEY, VALID_ID);

        expect(getVisitorId()).toBe(VALID_ID);
        expect(getVisitorId()).toBe(VALID_ID);
        expect(localStorage.getItem(STORAGE_KEY)).toBe(VALID_ID);
    });

    it('érvénytelen tárolt értéket új UUID-ra cserél', () => {
        localStorage.setItem(STORAGE_KEY, 'not-a-uuid');
        const generated = '22222222-2222-4222-8222-222222222222';
        jest.spyOn(crypto, 'randomUUID').mockReturnValue(generated);

        expect(getVisitorId()).toBe(generated);
        expect(localStorage.getItem(STORAGE_KEY)).toBe(generated);
    });

    it('új UUID-t generál, ha még nincs tárolva', () => {
        const generated = '33333333-3333-4333-8333-333333333333';
        jest.spyOn(crypto, 'randomUUID').mockReturnValue(generated);

        expect(getVisitorId()).toBe(generated);
        expect(localStorage.getItem(STORAGE_KEY)).toBe(generated);
    });
});
