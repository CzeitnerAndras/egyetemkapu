import { renderHook, act } from '@testing-library/react';
import { useNotice } from './useNotice';

describe('useNotice', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('alapból nyitva van, dismiss után bezárul, és sessionben megjegyzi', () => {
        const first = renderHook(() => useNotice('demo'));
        expect(first.result.current.open).toBe(true);

        act(() => {
            first.result.current.dismiss();
        });
        expect(first.result.current.open).toBe(false);
        expect(sessionStorage.getItem('notice:demo')).toBe('dismissed');

        const second = renderHook(() => useNotice('demo'));
        expect(second.result.current.open).toBe(false);
    });

    it('külön azonosítók egymástól függetlenek', () => {
        sessionStorage.setItem('notice:a', 'dismissed');
        const { result } = renderHook(() => useNotice('b'));
        expect(result.current.open).toBe(true);
    });
});
