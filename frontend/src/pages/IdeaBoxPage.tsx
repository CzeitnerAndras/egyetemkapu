import { useEffect, useRef, useState } from 'react';
import { Mail, Send, Lightbulb, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageHeader, PageShell } from '../components/PageLayout';

type Recaptcha = {
    ready: (callback: () => void) => void;
    render: (container: HTMLElement, parameters: { sitekey: string }) => number;
    getResponse: (widgetId?: number) => string;
    reset: (widgetId?: number) => void;
};

declare global {
    interface Window {
        grecaptcha?: Recaptcha;
    }
}

export default function IdeaBoxPage() {
    const { t, language } = useLanguage();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [siteKey, setSiteKey] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const captchaBox = useRef<HTMLDivElement>(null);
    const widgetId = useRef<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/suggestions/captcha')
            .then((res) => (res.ok ? res.json() : { siteKey: '' }))
            .then((data: { siteKey?: string }) => {
                if (!cancelled) setSiteKey(data.siteKey || '');
            })
            .catch(() => {
                if (!cancelled) setSiteKey('');
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!siteKey || !captchaBox.current) return;
        let cancelled = false;
        const paint = () => {
            if (cancelled || widgetId.current != null || !captchaBox.current || !window.grecaptcha) return;
            widgetId.current = window.grecaptcha.render(captchaBox.current, { sitekey: siteKey });
        };
        if (window.grecaptcha?.render) {
            if (window.grecaptcha.ready) window.grecaptcha.ready(paint);
            else paint();
            return () => {
                cancelled = true;
            };
        }
        const scriptId = 'egyetemkapu-recaptcha';
        let script = document.getElementById(scriptId) as HTMLScriptElement | null;
        const onLoad = () => window.grecaptcha?.ready(paint);
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = `https://www.google.com/recaptcha/api.js?render=explicit&hl=${language === 'en' ? 'en' : 'hu'}`;
            script.async = true;
            script.addEventListener('load', onLoad);
            document.head.appendChild(script);
        } else {
            script.addEventListener('load', onLoad);
        }
        return () => {
            cancelled = true;
            script?.removeEventListener('load', onLoad);
        };
    }, [siteKey, language]);

    const resetCaptcha = () => {
        if (widgetId.current != null) window.grecaptcha?.reset(widgetId.current);
    };

    {/* --- Submit --- */}
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!siteKey) {
            setMessage({ text: t('idea.captchaUnavailable'), type: 'error' });
            return;
        }
        const captchaToken = widgetId.current == null ? '' : window.grecaptcha?.getResponse(widgetId.current) || '';
        if (!captchaToken) {
            setMessage({ text: t('idea.captchaRequired'), type: 'error' });
            return;
        }
        setIsLoading(true);
        setMessage(null);

        try {
            const res = await fetch('/api/suggestions', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, captchaToken }),
            });
            if (res.status === 429) {
                setMessage({ text: t('idea.tooMany'), type: 'error' });
                resetCaptcha();
                return;
            }
            if (res.ok) {
                setMessage({ text: t('idea.thanks'), type: 'success' });
                setTitle('');
                setDescription('');
                resetCaptcha();
            } else {
                let failedCaptcha = false;
                try {
                    const body = await res.json();
                    failedCaptcha = body?.error === 'captcha';
                } catch {
                    failedCaptcha = false;
                }
                setMessage({ text: failedCaptcha ? t('idea.captchaFailed') : t('idea.sendError'), type: 'error' });
                resetCaptcha();
            }
        } catch {
            setMessage({ text: t('idea.serverError'), type: 'error' });
            resetCaptcha();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageShell>
            <PageHeader icon={Mail}>{t('idea.title')}</PageHeader>

            {/* --- Form --- */}
            <div className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#020617] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] secret:rounded-none flex flex-col">
                <div className="flex items-center mb-6 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                    <Lightbulb className="w-6 h-6 mr-2 text-black dark:text-white secret:text-[#1cf85d]" />
                    <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                        {t('idea.share')}
                    </h2>
                </div>

                <p className="text-sm font-bold text-gray-800 dark:text-gray-300 secret:text-[#1cf85d]/80 mb-2 secret:font-mono uppercase">
                    &gt; {t('idea.intro')}
                </p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-300 secret:text-[#1cf85d]/80 mb-6 secret:font-mono uppercase">
                    &gt; {t('idea.guest')}
                </p>

                {message && (
                    <div className={`p-4 mb-6 font-bold text-sm border-4 shadow-[4px_4px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase ${message.type === 'success'
                        ? 'bg-green-400 dark:bg-green-900/40 border-black dark:border-green-600 text-black dark:text-green-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]'
                        : 'bg-red-400 dark:bg-red-900/40 border-black dark:border-red-600 text-black dark:text-red-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]'
                        }`}>
                        {message.type === 'success' ? <Check className="inline w-5 h-5 mr-2 font-bold" /> : null}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-blue-950 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                            {t('idea.ideaTitle')}
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('idea.titlePlaceholder')}
                            className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-blue-800 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none text-lg font-bold secret:font-mono placeholder:secret:text-[#1cf85d]/50 transition-colors"
                        />
                    </div>

                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-blue-950 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                            {t('idea.description')}
                        </label>
                        <textarea
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('idea.descPlaceholder')}
                            rows={6}
                            className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-blue-800 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none resize-none font-bold text-base secret:font-mono placeholder:secret:text-[#1cf85d]/50 transition-colors"
                        />
                    </div>

                    <div className="bg-white border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none min-h-[78px]">
                        {siteKey === '' ? (
                            <p className="text-sm font-bold text-black">{t('idea.captchaUnavailable')}</p>
                        ) : (
                            <div ref={captchaBox} />
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-900 dark:bg-gradient-to-r dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white dark:text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] shadow-[4px_4px_0px_#000] dark:shadow-md secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-4 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_#000]"
                        >
                            <Send className="w-6 h-6 mr-2 font-bold" />
                            {isLoading ? t('idea.sending') : t('idea.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </PageShell>
    );
}