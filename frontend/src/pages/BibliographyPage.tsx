import { useState, type FormEvent } from 'react';
import { ListOrdered } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageHeader, PageShell } from '../components/PageLayout';
import { ToolDownNotice, toolFetch, toolIsDown, useToolHealth } from '../utils/toolFetch';

const SAMPLE = [
    'Szabó, Anna (2020). A város.',
    'Sipos, Béla (2018). A folyó.',
    'Csányi, Péter (2019). A híd.',
    'Czakó, Eszter (2021). A kert.',
    'Nagy, Imre (2017). A hegy.',
    'Nyírő, Júlia (2016). A rét.',
    'Sáros, Kata (2013). A part.',
    'Ádám, Gábor (2015). A tó.',
    'Antal, Béla (2014). A ház.',
].join('\n');

interface SortResult {
    entries: string[];
    count: number;
}

function isResult(data: unknown): data is SortResult {
    if (!data || typeof data !== 'object') return false;
    const result = data as SortResult;
    return Array.isArray(result.entries) && result.entries.every((entry) => typeof entry === 'string') && typeof result.count === 'number';
}

export default function BibliographyPage() {
    const { t } = useLanguage();
    const [text, setText] = useState('');
    const [result, setResult] = useState<SortResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const down = useToolHealth('/api/bibliography/health') || failed;

    const handleSort = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setResult(null);
        setCopied(false);

        if (!text.trim()) {
            setError(t('bib.err.empty'));
            return;
        }

        setLoading(true);
        try {
            const response = await toolFetch('/api/bibliography/sort', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            const data: unknown = await response.json().catch(() => null);
            if (toolIsDown(response.status)) {
                setFailed(true);
                setError(null);
                return;
            }
            if (!response.ok || !isResult(data)) {
                const detail = data && typeof data === 'object' && 'detail' in data && typeof (data as { detail: unknown }).detail === 'string'
                    ? (data as { detail: string }).detail
                    : '';
                if (detail === 'too_long' || response.status === 422) setError(t('bib.err.tooLong'));
                else if (detail === 'too_many') setError(t('bib.err.tooMany'));
                else if (detail === 'empty_text' || response.status === 400) setError(t('bib.err.empty'));
                else setError(t('bib.error'));
                return;
            }
            setFailed(false);
            setResult(data);
        } catch {
            setFailed(true);
            setError(null);
        } finally {
            setLoading(false);
        }
    };

    const copyEntries = async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.entries.join('\n'));
            setCopied(true);
        } catch {
            setCopied(false);
            setError(t('bib.copyFailed'));
        }
    };

    return (
        <PageShell>
            <PageHeader icon={ListOrdered}>{t('bib.title')}</PageHeader>
            <p className="mb-6 max-w-3xl text-black dark:text-gray-200 secret:text-[#1cf85d] secret:font-mono">
                {t('bib.intro')}
            </p>
            {down && <ToolDownNotice message={t('bib.down')} />}

            <form onSubmit={handleSort} className="flex flex-col gap-6">
                <label className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase">
                        {t('bib.text')}
                    </span>
                    <textarea
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        rows={12}
                        placeholder={t('bib.placeholder')}
                        className="w-full border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono p-4 outline-none shadow-[4px_4px_0px_#000] dark:shadow-inner"
                    />
                </label>
                <p className="text-sm text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono -mt-3">
                    {t('bib.hint')}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => setText(SAMPLE)}
                        className="sm:w-auto border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold py-3 px-4 secret:font-mono uppercase cursor-pointer"
                    >
                        {t('bib.sample')}
                    </button>
                    <button
                        type="submit"
                        disabled={loading || down}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-950 dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 border-4 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50 shadow-[4px_4px_0px_#000] dark:shadow-md"
                    >
                        <ListOrdered className="w-5 h-5 mr-2" />
                        {loading ? t('bib.sorting') : t('bib.sort')}
                    </button>
                </div>

                {error && (
                    <div className="bg-blue-900 dark:bg-red-900/40 secret:bg-black border-4 border-black dark:border-red-500 secret:border-[#1cf85d] text-white dark:text-red-300 secret:text-[#1cf85d] p-4 font-bold text-sm shadow-[4px_4px_0px_#000] secret:font-mono">
                        &gt; {error}
                    </div>
                )}

                {result && (
                    <section aria-live="polite" className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#1e1e1e] secret:bg-black shadow-[6px_6px_0px_#1e3a8a] dark:shadow-inner p-6 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <p className="text-sm font-bold uppercase tracking-wider text-black dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono">
                                {t('bib.count', { count: result.count })}
                            </p>
                            <button
                                type="button"
                                onClick={copyEntries}
                                className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold py-2 px-4 secret:font-mono uppercase cursor-pointer"
                            >
                                {copied ? t('bib.copied') : t('bib.copy')}
                            </button>
                        </div>
                        <ol className="list-decimal pl-6 flex flex-col gap-2 text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">
                            {result.entries.map((entry, index) => (
                                <li key={`${index}-${entry}`} className="break-words pl-1">
                                    {entry}
                                </li>
                            ))}
                        </ol>
                    </section>
                )}
            </form>
        </PageShell>
    );
}
