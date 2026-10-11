import { FLYER_ORIGIN, isFlyerHost, isStudentProductionHost } from './flyerSite';

describe('flyerSite', () => {
    it('a flyer címet csak a saját hoszton ismeri fel', () => {
        expect(FLYER_ORIGIN).toBe('https://akcio.egyetemkapu.hu');
        expect(isFlyerHost('akcio.egyetemkapu.hu')).toBe(true);
        expect(isFlyerHost('egyetemkapu.hu')).toBe(false);
        expect(isFlyerHost('localhost')).toBe(false);
    });

    it('a diákoldal éles címét ismeri fel', () => {
        expect(isStudentProductionHost('egyetemkapu.hu')).toBe(true);
        expect(isStudentProductionHost('www.egyetemkapu.hu')).toBe(true);
        expect(isStudentProductionHost('localhost')).toBe(false);
        expect(isStudentProductionHost('akcio.egyetemkapu.hu')).toBe(false);
    });
});
