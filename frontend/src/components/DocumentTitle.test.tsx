import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DocumentTitle from './DocumentTitle';

jest.mock('../i18n/LanguageContext', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        language: 'hu',
    }),
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
});
