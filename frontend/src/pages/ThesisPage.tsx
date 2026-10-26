import { useState, type FormEvent } from 'react';
import { FileText } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageHeader, PageShell } from '../components/PageLayout';

const SAMPLE = 'A szakdolgozat összegzése rövid. Ld. pl. a 3,14. ábrát, és a szak-dolgozat kötőjeles alakja is egy szó. Ez a hosszabb mondat azért hosszabb, hogy ő legyen a leghosszabb.';

interface LengthReport {
    words: number;
    characters: number;
    charactersNoSpaces: number;
    sentences: number;
    paragraphs: number;
    longestSentenceWords: number;
    longestSentence: string;
    readingSeconds: number;
    readingWpm: number;
    wordLimit: number | null;
    wordsOver: number;
    wordStatus: 'within' | 'over' | 'unset';
    characterLimit: number | null;
    charactersOver: number;
    characterStatus: 'within' | 'over' | 'unset';
}

function isReport(data: unknown): data is LengthReport {
    if (!data || typeof data !== 'object') return false;
    const report = data as LengthReport;
    return typeof report.words === 'number' && typeof report.readingSeconds === 'number' && typeof report.longestSentence === 'string';
}

function parseLimit(raw: string): number | null | 'invalid' {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (!/^\d+$/.test(trimmed)) return 'invalid';
    const parsed = Number(trimmed);
    return parsed > 0 ? parsed : 'invalid';
}

export default function ThesisPage() {
    const { t } = useLanguage();
    const [text, setText] = useState('');
    const [wordLimit, setWordLimit] = useState('250');
    const [characterLimit, setCharacterLimit] = useState('');
    const [report, setReport] = useState<LengthReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const readingLabel = (seconds: number): string => {
        if (seconds <= 0) return t('thesis.readingNone');
        const minutes = Math.floor(seconds / 60);
        const rest = seconds % 60;
        if (minutes === 0) return t('thesis.readingSeconds', { seconds: rest });
        if (rest === 0) return t('thesis.readingMinutes', { minutes });
        return t('thesis.readingBoth', { minutes, seconds: rest });
    };

    const limitLabel = (status: LengthReport['wordStatus'], over: number): string => {
        if (status === 'within') return t('thesis.status.within');
        if (status === 'over') return t('thesis.status.over', { over });
        return '';
    };

    const handleCheck = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setReport(null);

        if (!text.trim()) {
            setError(t('thesis.err.empty'));
            return;
        }
        const words = parseLimit(wordLimit);
        const characters = parseLimit(characterLimit);
        if (words === 'invalid' || characters === 'invalid') {
            setError(t('thesis.err.limit'));
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/thesis/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, wordLimit: words, characterLimit: characters }),
            });
            const data: unknown = await response.json().catch(() => null);
            if (!response.ok || !isReport(data)) {
                const detail = data && typeof data === 'object' && 'detail' in data && typeof (data as { detail: unknown }).detail === 'string'
                    ? (data as { detail: string }).detail
                    : '';
                setError(t(detail === 'too_long' ? 'thesis.err.tooLong' : response.status === 400 ? 'thesis.err.empty' : 'thesis.error'));
                return;
            }
            setReport(data);
        } catch {
            setError(t('thesis.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageShell>
            <PageHeader icon={FileText}>{t('thesis.title')}</PageHeader>
            <p className="mb-6 max-w-3xl text-black dark:text-gray-200 secret:text-[#1cf85d] secret:font-mono">
                {t('thesis.intro')}
            </p>

            <form onSubmit={handleCheck} className="flex flex-col gap-6">
                <label className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase">
                        {t('thesis.text')}
                    </span>
                    <textarea
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        rows={10}
                        placeholder={t('thesis.placeholder')}
                        className="w-full border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono p-4 outline-none shadow-[4px_4px_0px_#000] dark:shadow-inner"
                    />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase">
                            {t('thesis.wordLimit')}
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={wordLimit}
                            aria-label={t('thesis.wordLimit')}
                            onChange={(event) => setWordLimit(event.target.value)}
                            className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono p-3 outline-none font-bold"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase">
                            {t('thesis.characterLimit')}
                        </span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={characterLimit}
                            aria-label={t('thesis.characterLimit')}
                            onChange={(event) => setCharacterLimit(event.target.value)}
                            placeholder={t('thesis.limitOptional')}
                            className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono p-3 outline-none font-bold placeholder:font-normal"
                        />
                    </label>
                </div>
                <p className="text-sm text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono -mt-3">
                    {t('thesis.limitHint')}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => setText(SAMPLE)}
                        className="sm:w-auto border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold py-3 px-4 secret:font-mono uppercase cursor-pointer"
                    >
                        {t('thesis.sample')}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-950 dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 border-4 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50 shadow-[4px_4px_0px_#000] dark:shadow-md"
                    >
                        <FileText className="w-5 h-5 mr-2" />
                        {loading ? t('thesis.checking') : t('thesis.check')}
                    </button>
                </div>

                {error && (
                    <div className="bg-blue-900 dark:bg-red-900/40 secret:bg-black border-4 border-black dark:border-red-500 secret:border-[#1cf85d] text-white dark:text-red-300 secret:text-[#1cf85d] p-4 font-bold text-sm shadow-[4px_4px_0px_#000] secret:font-mono">
                        &gt; {error}
                    </div>
                )}

                {report && (
                    <section aria-live="polite" className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#1e1e1e] secret:bg-black shadow-[6px_6px_0px_#1e3a8a] dark:shadow-inner p-6 flex flex-col gap-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Count label={t('thesis.words')} value={report.words} note={limitLabel(report.wordStatus, report.wordsOver)} />
                            <Count label={t('thesis.characters')} value={report.characters} note={limitLabel(report.characterStatus, report.charactersOver)} />
                            <Count label={t('thesis.sentences')} value={report.sentences} note={t('thesis.paragraphs', { count: report.paragraphs })} />
                            <Count label={t('thesis.reading')} value={readingLabel(report.readingSeconds)} note={t('thesis.readingPace', { wpm: report.readingWpm })} />
                        </div>
                        <p className="text-sm font-bold text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono">
                            {t('thesis.charactersNoSpaces', { count: report.charactersNoSpaces })}
                        </p>
                        {report.longestSentence && (
                            <div>
                                <p className="text-sm font-bold uppercase tracking-wider text-black dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono">
                                    {t('thesis.longest', { count: report.longestSentenceWords })}
                                </p>
                                <p className="mt-2 border-2 border-black dark:border-gray-700 secret:border-[#1cf85d] p-3 text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">
                                    {report.longestSentence}
                                </p>
                            </div>
                        )}
                    </section>
                )}
            </form>
        </PageShell>
    );
}

function Count({ label, value, note }: { label: string; value: string | number; note: string }) {
    return (
        <div className="border-2 border-black dark:border-gray-700 secret:border-[#1cf85d] p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-black dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono">
                {label}
            </p>
            <p className="text-3xl font-black text-blue-950 dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono break-words">
                {value}
            </p>
            {note ? (
                <p className="text-sm font-bold text-black dark:text-gray-200 secret:text-[#1cf85d] secret:font-mono">
                    {note}
                </p>
            ) : null}
        </div>
    );
}
