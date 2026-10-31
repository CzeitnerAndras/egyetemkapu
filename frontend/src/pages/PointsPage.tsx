import { useRef, useState, type FormEvent } from 'react';
import { Plus, Target, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageHeader, PageShell } from '../components/PageLayout';
import { ToolDownNotice, toolFetch, toolIsDown, useToolHealth } from '../utils/toolFetch';

interface PartRow {
    id: number;
    name: string;
    maxPoints: string;
    earned: string;
    open: boolean;
}

interface ThresholdRow {
    grade: 2 | 3 | 4 | 5;
    minPercent: string;
}

interface GradeTarget {
    grade: number;
    minPercent: number;
    pointsRequired: number;
    pointsNeeded: number;
    status: 'already' | 'reachable' | 'impossible';
}

interface PlanResult {
    maxTotal: number;
    earnedSoFar: number;
    remainingMax: number;
    currentPercent: number;
    currentGrade: number;
    openPartNames: string[];
    targets: GradeTarget[];
}

const ERROR_KEYS: Record<string, string> = {
    earned_above_max: 'points.err.earnedAboveMax',
    threshold_order: 'points.err.thresholdOrder',
    duplicate_grade: 'points.err.duplicateGrade',
    too_many_decimals: 'points.err.decimals',
    empty_name: 'points.err.emptyName',
};

const DEFAULT_THRESHOLDS: ThresholdRow[] = [
    { grade: 2, minPercent: '50' },
    { grade: 3, minPercent: '65' },
    { grade: 4, minPercent: '75' },
    { grade: 5, minPercent: '85' },
];

function formatPoints(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}

function normalize(raw: string): string {
    return raw.trim().replace(',', '.');
}

function tooManyDecimals(raw: string): boolean {
    const fraction = normalize(raw).split('.')[1] ?? '';
    return fraction.length > 2;
}

function parseAmount(raw: string): number | null {
    const normalized = normalize(raw);
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function isPlan(data: unknown): data is PlanResult {
    if (!data || typeof data !== 'object') return false;
    const plan = data as PlanResult;
    return typeof plan.currentPercent === 'number' && Array.isArray(plan.targets) && Array.isArray(plan.openPartNames);
}

export default function PointsPage() {
    const { t, locale } = useLanguage();
    const nextId = useRef(4);
    const [parts, setParts] = useState<PartRow[]>([
        { id: 1, name: 'ZH', maxPoints: '30', earned: '22', open: false },
        { id: 2, name: 'Beadandó', maxPoints: '20', earned: '16', open: false },
        { id: 3, name: 'Vizsga', maxPoints: '50', earned: '', open: true },
    ]);
    const [thresholds, setThresholds] = useState<ThresholdRow[]>(DEFAULT_THRESHOLDS);
    const [result, setResult] = useState<PlanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const down = useToolHealth('/api/points/health') || failed;

    const updatePart = (id: number, patch: Partial<PartRow>) => {
        setParts((current) => current.map((part) => (part.id === id ? { ...part, ...patch } : part)));
    };

    const addPart = () => {
        const id = nextId.current;
        nextId.current += 1;
        setParts((current) => [...current, { id, name: '', maxPoints: '10', earned: '', open: true }]);
    };

    const removePart = (id: number) => {
        setParts((current) => (current.length > 1 ? current.filter((part) => part.id !== id) : current));
    };

    {/* --- Plan --- */}
    const handlePlan = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setResult(null);

        const payloadParts = [];
        for (const part of parts) {
            if (!part.name.trim()) {
                setError(t('points.err.emptyName'));
                return;
            }
            if (tooManyDecimals(part.maxPoints) || (!part.open && tooManyDecimals(part.earned))) {
                setError(t('points.err.decimals'));
                return;
            }
            const maxPoints = parseAmount(part.maxPoints);
            if (maxPoints === null || maxPoints <= 0) {
                setError(t('points.invalid'));
                return;
            }
            let earned: number | null = null;
            if (!part.open) {
                earned = parseAmount(part.earned);
                if (earned === null || earned < 0) {
                    setError(t('points.invalid'));
                    return;
                }
                if (earned > maxPoints) {
                    setError(t('points.err.earnedAboveMax'));
                    return;
                }
            }
            payloadParts.push({ name: part.name.trim(), maxPoints, earned });
        }

        const payloadThresholds = [];
        let previous = 0;
        for (const threshold of thresholds) {
            if (tooManyDecimals(threshold.minPercent)) {
                setError(t('points.err.decimals'));
                return;
            }
            const minPercent = parseAmount(threshold.minPercent);
            if (minPercent === null || minPercent <= 0 || minPercent > 100 || minPercent <= previous) {
                setError(t('points.err.thresholdOrder'));
                return;
            }
            previous = minPercent;
            payloadThresholds.push({ grade: threshold.grade, minPercent });
        }

        setLoading(true);
        try {
            const response = await toolFetch('/api/points/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parts: payloadParts, thresholds: payloadThresholds }),
            });
            const data: unknown = await response.json().catch(() => null);
            if (toolIsDown(response.status)) {
                setFailed(true);
                setError(null);
                return;
            }
            if (!response.ok || !isPlan(data)) {
                const detail = data && typeof data === 'object' && 'detail' in data ? String((data as { detail: unknown }).detail) : '';
                setError(t(ERROR_KEYS[detail] ?? (response.status === 400 ? 'points.invalid' : 'points.error')));
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

    const targetLine = (target: GradeTarget, plan: PlanResult): string => {
        const needed = formatPoints(target.pointsNeeded, locale);
        const left = formatPoints(plan.remainingMax, locale);
        if (target.status === 'already') return t('points.status.already');
        if (target.status === 'impossible') return t('points.status.impossible', { needed, left });
        if (plan.openPartNames.length === 1) {
            return t('points.status.reachableOn', { name: plan.openPartNames[0], needed });
        }
        return t('points.status.reachableMany', { needed });
    };

    return (
        <PageShell>
            <PageHeader icon={Target}>{t('points.title')}</PageHeader>
            <p className="mb-6 max-w-3xl text-black dark:text-gray-200 secret:text-[#1cf85d] secret:font-mono">
                {t('points.intro')}
            </p>
            {down && <ToolDownNotice message={t('points.down')} />}

            <form onSubmit={handlePlan} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:items-start">
                    <section className="flex flex-col border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[8px_8px_0px_#1e3a8a] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] rounded-sm secret:rounded-none">
                        <div className="bg-blue-500 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center space-x-3 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d]">
                            <Target className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d]" />
                            <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                                {t('points.parts')}
                            </h2>
                        </div>
                        <div className="p-6 flex flex-col gap-3">
                            {parts.map((part) => (
                                <div key={part.id} className="flex flex-col gap-2 bg-white dark:bg-[#121212] secret:bg-transparent p-3 border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] secret:border-dashed shadow-[2px_2px_0px_#000] dark:shadow-sm">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                        <label className="flex-1 min-w-0">
                                            <span className="text-xs font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase">{t('points.partName')}</span>
                                            <input
                                                type="text"
                                                required
                                                maxLength={80}
                                                value={part.name}
                                                aria-label={t('points.partName')}
                                                onChange={(event) => updatePart(part.id, { name: event.target.value })}
                                                className="w-full border-b-2 border-black dark:border-gray-700 secret:border-[#1cf85d] bg-transparent outline-none px-1 py-1 text-black dark:text-white secret:text-[#1cf85d] secret:font-mono"
                                            />
                                        </label>
                                        <div className="flex gap-2 items-end">
                                            <label className="flex-1 sm:flex-none sm:w-24">
                                                <span className="text-xs font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase block text-center">{t('points.max')}</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    required
                                                    value={part.maxPoints}
                                                    aria-label={t('points.max')}
                                                    onChange={(event) => updatePart(part.id, { maxPoints: event.target.value })}
                                                    className="w-full text-center border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] outline-none secret:font-mono"
                                                />
                                            </label>
                                            <label className="flex-1 sm:flex-none sm:w-24">
                                                <span className="text-xs font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase block text-center">{t('points.earned')}</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    required={!part.open}
                                                    disabled={part.open}
                                                    value={part.open ? '' : part.earned}
                                                    aria-label={t('points.earned')}
                                                    onChange={(event) => updatePart(part.id, { earned: event.target.value })}
                                                    className="w-full text-center border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] outline-none secret:font-mono disabled:opacity-40"
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => removePart(part.id)}
                                                className="shrink-0 p-2 text-black hover:text-red-600 dark:text-gray-500 secret:text-[#1cf85d]/50 secret:hover:text-[#1cf85d] cursor-pointer"
                                                title={t('points.delete')}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <label className="inline-flex items-center gap-2 text-sm font-bold text-black dark:text-gray-200 secret:text-[#1cf85d] secret:font-mono cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={part.open}
                                            onChange={(event) => updatePart(part.id, { open: event.target.checked })}
                                        />
                                        {t('points.notYet')}
                                    </label>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addPart}
                                className="w-full border-4 border-dashed border-black dark:border-[#a855f7] secret:border-[#1cf85d] text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold py-2 flex items-center justify-center hover:bg-blue-500 dark:hover:bg-[#a855f7]/10 secret:hover:bg-[#1cf85d] secret:hover:text-black cursor-pointer secret:font-mono uppercase shadow-[4px_4px_0px_#000] dark:shadow-none"
                            >
                                <Plus className="w-5 h-5 mr-1" /> {t('points.addPart')}
                            </button>
                        </div>
                    </section>

                    <section className="flex flex-col border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[8px_8px_0px_#020617] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] rounded-sm secret:rounded-none">
                        <div className="bg-blue-900 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d]">
                            <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                                {t('points.thresholds')}
                            </h2>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <p className="text-sm text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono">
                                {t('points.thresholdsHint')}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {thresholds.map((threshold) => (
                                    <label key={threshold.grade} className="flex flex-col bg-white dark:bg-[#121212] secret:bg-transparent p-3 border-2 border-black dark:border-gray-600 secret:border-[#1cf85d]">
                                        <span className="text-xs font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase">
                                            {t(`points.grade.${threshold.grade}`)}
                                        </span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            required
                                            aria-label={t(`points.grade.${threshold.grade}`)}
                                            value={threshold.minPercent}
                                            onChange={(event) => {
                                                const minPercent = event.target.value;
                                                setThresholds((current) => current.map((item) => (
                                                    item.grade === threshold.grade ? { ...item, minPercent } : item
                                                )));
                                            }}
                                            className="mt-1 text-center border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] outline-none text-lg font-bold secret:font-mono"
                                        />
                                    </label>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => setThresholds(DEFAULT_THRESHOLDS.map((item) => ({ ...item })))}
                                className="text-sm font-bold underline text-blue-950 dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono text-left cursor-pointer"
                            >
                                {t('points.preset')}
                            </button>
                        </div>
                    </section>
                </div>

                <button
                    type="submit"
                    disabled={loading || down}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-950 dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 border-4 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50 shadow-[4px_4px_0px_#000] dark:shadow-md"
                >
                    <Target className="w-5 h-5 mr-2" />
                    {loading ? t('points.calculating') : t('points.calculate')}
                </button>

                {error && (
                    <div className="bg-blue-900 dark:bg-red-900/40 secret:bg-black border-4 border-black dark:border-red-500 secret:border-[#1cf85d] text-white dark:text-red-300 secret:text-[#1cf85d] p-4 font-bold text-sm shadow-[4px_4px_0px_#000] secret:font-mono">
                        &gt; {error}
                    </div>
                )}

                {result && (
                    <section aria-live="polite" className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#1e1e1e] secret:bg-black shadow-[6px_6px_0px_#1e3a8a] dark:shadow-inner p-6">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b-4 border-black dark:border-gray-800 secret:border-[#1cf85d]/30 pb-4">
                            <div>
                                <p className="text-sm font-bold uppercase tracking-wider text-black dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono">
                                    {t('points.current')}
                                </p>
                                <p className="text-5xl font-black text-blue-950 dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono">
                                    {formatPoints(result.currentPercent, locale)}%
                                </p>
                                <p className="font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">
                                    {t('points.scoreLine', {
                                        earned: formatPoints(result.earnedSoFar, locale),
                                        max: formatPoints(result.maxTotal, locale),
                                    })}
                                </p>
                            </div>
                            <p className="text-lg font-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                                {t('points.gradeNow')}: {result.currentGrade === 1 ? t('points.fail') : t(`points.grade.${result.currentGrade}`)}
                            </p>
                        </div>
                        <p className="mt-4 text-sm font-bold text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono">
                            {t('points.left', { left: formatPoints(result.remainingMax, locale) })}
                        </p>
                        <ul className="mt-4 flex flex-col gap-3">
                            {result.targets.map((target) => (
                                <li key={target.grade} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-2 border-black dark:border-gray-700 secret:border-[#1cf85d] p-3">
                                    <span className="font-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                                        {t(`points.grade.${target.grade}`)}
                                    </span>
                                    <span className="text-black dark:text-gray-200 secret:text-[#1cf85d] secret:font-mono">
                                        {targetLine(target, result)}
                                        {' '}
                                        <span className="text-sm opacity-80">
                                            ({t('points.requiredTotal', { required: formatPoints(target.pointsRequired, locale) })})
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </form>
        </PageShell>
    );
}
