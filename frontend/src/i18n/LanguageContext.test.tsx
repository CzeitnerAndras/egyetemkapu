import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LanguageProvider, useLanguage } from './LanguageContext';
import { fetchWithAuth } from '../utils/authApi';

jest.mock('../utils/authApi', () => ({
    fetchWithAuth: jest.fn().mockResolvedValue({ ok: true }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
    <LanguageProvider>{children}</LanguageProvider>
);

describe('LanguageContext', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.lang = '';
        jest.clearAllMocks();
    });

    it('token nélkül magyarra áll, és a toggle angolra vált', () => {
        const { result } = renderHook(() => useLanguage(), { wrapper });

        expect(result.current.language).toBe('hu');
        expect(result.current.locale).toBe('hu-HU');
        expect(document.documentElement.lang).toBe('hu');
        expect(result.current.t('nav.calendar')).toBe('Naptár');

        act(() => {
            result.current.toggleLanguage();
        });

        expect(result.current.language).toBe('en');
        expect(result.current.locale).toBe('en-GB');
        expect(localStorage.getItem('language')).toBe('en');
        expect(result.current.t('nav.calendar')).toBe('Calendar');
        expect(fetchWithAuth).toHaveBeenCalled();
    });

    it('nyelvváltáskor elmenti a nyelvet a szerverre', async () => {
        localStorage.setItem('token', 'test-token');
        localStorage.setItem('language', 'en');

        renderHook(() => useLanguage(), { wrapper });

        await waitFor(() => {
            expect(fetchWithAuth).toHaveBeenCalledWith(
                '/api/users/me/language',
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify({ language: 'en' }),
                }),
                { redirectOnAuthFailure: false, retryOn401: false }
            );
        });
    });

    it('LanguageProvider nélkül hibát dob', () => {
        expect(() => renderHook(() => useLanguage())).toThrow(
            'useLanguage must be used within LanguageProvider'
        );
    });
});
