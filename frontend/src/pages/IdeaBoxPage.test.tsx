import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IdeaBoxPage from './IdeaBoxPage';

jest.mock('../i18n/LanguageContext', () => {
    const translate = (key: string) => key;
    return {
        useLanguage: () => ({ t: translate, language: 'hu' }),
    };
});

const installCaptcha = (token: string) => {
    window.grecaptcha = {
        ready: (callback) => callback(),
        render: jest.fn(() => 7),
        getResponse: () => token,
        reset: jest.fn(),
    };
};

const mockApi = (suggestion: unknown) => {
    (globalThis.fetch as jest.Mock).mockImplementation((url: string) => {
        if (String(url).includes('captcha')) {
            return Promise.resolve({ ok: true, json: async () => ({ siteKey: 'site-key' }) });
        }
        return Promise.resolve(suggestion);
    });
};

describe('IdeaBoxPage Komponens', () => {
    beforeEach(() => {
        globalThis.fetch = jest.fn().mockImplementation((url: string) => {
            if (String(url).includes('captcha')) {
                return Promise.resolve({ ok: true, json: async () => ({ siteKey: 'site-key' }) });
            }
            return Promise.resolve({ ok: true, json: async () => ({}) });
        });
        localStorage.clear();
        jest.clearAllMocks();
        installCaptcha('token');
    });

    it('megjeleníti a címet és a bevezető szöveget', async () => {
        render(<IdeaBoxPage />);

        expect(screen.getByText('idea.title')).toBeInTheDocument();
        expect(screen.getByText(/idea\.intro/)).toBeInTheDocument();
        expect(screen.getByText(/idea\.guest/)).toBeInTheDocument();
        await waitFor(() => expect(window.grecaptcha?.render).toHaveBeenCalled());
    });

    it('robotellenőrzés nélkül nem küldi el az ötletet', async () => {
        installCaptcha('');
        mockApi({ ok: true, json: async () => ({}) });

        const user = userEvent.setup();
        render(<IdeaBoxPage />);
        await waitFor(() => expect(window.grecaptcha?.render).toHaveBeenCalled());

        await user.type(screen.getByPlaceholderText('idea.titlePlaceholder'), 'Több zöld terület');
        await user.type(screen.getByPlaceholderText('idea.descPlaceholder'), 'Legyen park az egyetem mellett.');
        await user.click(screen.getByRole('button', { name: 'idea.submit' }));

        await waitFor(() => {
            expect(screen.getByText('idea.captchaRequired')).toBeInTheDocument();
        });
        expect(globalThis.fetch).not.toHaveBeenCalledWith('/api/suggestions', expect.anything());
        expect(screen.getByRole('button', { name: 'idea.submit' })).not.toBeDisabled();
    });

    it('fiók nélkül is elküldi az ötletet a robotellenőrzés után', async () => {
        mockApi({ ok: true, json: async () => ({}) });

        const user = userEvent.setup();
        render(<IdeaBoxPage />);
        await waitFor(() => expect(window.grecaptcha?.render).toHaveBeenCalled());

        const titleInput = screen.getByPlaceholderText('idea.titlePlaceholder');
        const descInput = screen.getByPlaceholderText('idea.descPlaceholder');

        await user.type(titleInput, 'Több zöld terület');
        await user.type(descInput, 'Legyen park az egyetem mellett.');
        await user.click(screen.getByRole('button', { name: 'idea.submit' }));

        await waitFor(() => {
            expect(globalThis.fetch).toHaveBeenCalledWith(
                '/api/suggestions',
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({
                        title: 'Több zöld terület',
                        description: 'Legyen park az egyetem mellett.',
                        captchaToken: 'token',
                    }),
                })
            );
            expect(screen.getByText('idea.thanks')).toBeInTheDocument();
        });

        expect(titleInput).toHaveValue('');
        expect(descInput).toHaveValue('');
    });

    it('hibaüzenetet jelez, ha a robotellenőrzést a szerver elutasítja', async () => {
        mockApi({
            ok: false,
            status: 400,
            json: async () => ({ error: 'captcha' }),
        });

        const user = userEvent.setup();
        render(<IdeaBoxPage />);
        await waitFor(() => expect(window.grecaptcha?.render).toHaveBeenCalled());

        await user.type(screen.getByPlaceholderText('idea.titlePlaceholder'), 'Cím');
        await user.type(screen.getByPlaceholderText('idea.descPlaceholder'), 'Leírás');
        await user.click(screen.getByRole('button', { name: 'idea.submit' }));

        await waitFor(() => {
            expect(screen.getByText('idea.captchaFailed')).toBeInTheDocument();
        });
    });

    it('hibaüzenetet jelez, ha a kérés kapcsolódási hiba miatt elbukik', async () => {
        (globalThis.fetch as jest.Mock).mockImplementation((url: string) => {
            if (String(url).includes('captcha')) {
                return Promise.resolve({ ok: true, json: async () => ({ siteKey: 'site-key' }) });
            }
            return Promise.reject(new Error('network down'));
        });

        const user = userEvent.setup();
        render(<IdeaBoxPage />);
        await waitFor(() => expect(window.grecaptcha?.render).toHaveBeenCalled());

        await user.type(screen.getByPlaceholderText('idea.titlePlaceholder'), 'Cím');
        await user.type(screen.getByPlaceholderText('idea.descPlaceholder'), 'Leírás');
        await user.click(screen.getByRole('button', { name: 'idea.submit' }));

        await waitFor(() => {
            expect(screen.getByText('idea.serverError')).toBeInTheDocument();
        });
    });

    it('küldés közben letiltja a gombot, és a "sending" feliratot mutatja', async () => {
        let resolveFetch: (value: unknown) => void = () => { };
        (globalThis.fetch as jest.Mock).mockImplementation((url: string) => {
            if (String(url).includes('captcha')) {
                return Promise.resolve({ ok: true, json: async () => ({ siteKey: 'site-key' }) });
            }
            return new Promise((resolve) => {
                resolveFetch = resolve;
            });
        });

        const user = userEvent.setup();
        render(<IdeaBoxPage />);
        await waitFor(() => expect(window.grecaptcha?.render).toHaveBeenCalled());

        await user.type(screen.getByPlaceholderText('idea.titlePlaceholder'), 'Cím');
        await user.type(screen.getByPlaceholderText('idea.descPlaceholder'), 'Leírás');
        await user.click(screen.getByRole('button', { name: 'idea.submit' }));

        const pendingButton = screen.getByRole('button', { name: 'idea.sending' });
        expect(pendingButton).toBeDisabled();

        resolveFetch({ ok: true, json: async () => ({}) });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'idea.submit' })).not.toBeDisabled();
        });
    });
});
