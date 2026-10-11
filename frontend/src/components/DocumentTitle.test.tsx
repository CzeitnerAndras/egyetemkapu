import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DocumentTitle from './DocumentTitle';
import { isFlyerHost } from '../utils/flyerSite';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        language: 'hu',
    }),
}));

jest.mock('../utils/flyerSite', () => ({
    FLYER_ORIGIN: 'https://akcio.egyetemkapu.hu',
    isFlyerHost: jest.fn(() => false),
}));

const renderAt = (path: string) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <DocumentTitle />
        </MemoryRouter>
    );

describe('DocumentTitle', () => {
    it('a kezdőlap a keresőbarát alapcímet használja', () => {
        renderAt('/');

        expect(document.title).toBe('seo.defaultTitle');
        expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://egyetemkapu.hu/');
        expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow');
    });

    it('a nyilvános aloldalak címébe bekerül az oldal neve', () => {
        renderAt('/about');

        expect(document.title).toBe('about.title | Egyetemkapu');
        expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://egyetemkapu.hu/about');
        expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('seo.description');
    });

    it('a privát oldalakat noindexre állítja', () => {
        renderAt('/admin');

        expect(document.title).toBe('admin.title | Egyetemkapu');
        expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    });

    it('a kártyák oldalának címe a cards.title kulcs', () => {
        renderAt('/kartyak');

        expect(document.title).toBe('cards.title | Egyetemkapu');
        expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
            .toBe('https://egyetemkapu.hu/kartyak');
    });

    it('az akciós oldal a saját címét és leírását használja', () => {
        (isFlyerHost as unknown as jest.Mock).mockReturnValue(true);
        renderAt('/');

        expect(document.title).toBe('sales.title');
        expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('seo.flyersDescription');
        expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://akcio.egyetemkapu.hu/');
        expect(document.head.querySelector('meta[property="og:site_name"]')?.getAttribute('content')).toBe('sales.title');
        (isFlyerHost as unknown as jest.Mock).mockReturnValue(false);
    });

    it('a jelszó-visszaállító oldalakat is noindexre állítja', () => {
        renderAt('/elfelejtett-jelszo');

        expect(document.title).toBe('forgot.title | Egyetemkapu');
        expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
        expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
            .toBe('https://egyetemkapu.hu/elfelejtett-jelszo');
    });
});
