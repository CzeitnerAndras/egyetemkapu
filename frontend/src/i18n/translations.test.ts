import { translations, translate } from './translations';

describe('translations', () => {
    it('a magyar és angol kulcskészlet megegyezik', () => {
        expect(Object.keys(translations.en).sort()).toEqual(Object.keys(translations.hu).sort());
    });

    it('behelyettesíti a változókat, hiányzó kulcsnál a kulcsot adja vissza', () => {
        expect(translate('hu', 'home.dateLabel', { date: '2026-09-21' })).toBe('Dátum: 2026-09-21');
        expect(translate('en', 'home.dateLabel', { date: '2026-09-21' })).toBe('Date: 2026-09-21');
        expect(translate('en', 'missing.key')).toBe('missing.key');
    });
});
