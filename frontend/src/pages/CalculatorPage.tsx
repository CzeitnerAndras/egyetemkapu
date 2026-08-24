import { useState } from 'react';
import { Calculator, Sigma, Plus, Trash2, FunctionSquare, ArrowRight, ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface Subject {
    id: number;
    name: string;
    credit: number;
    grade: number;
}

export default function CalculatorPage() {
    const { t } = useLanguage();
    const [subjects, setSubjects] = useState<Subject[]>([{ id: Date.now(), name: '', credit: 3, grade: 5 }, { id: Date.now() + 1, name: '', credit: 3, grade: 5 }]);
    const [averageResult, setAverageResult] = useState<number | null>(null);
    const [averageLoading, setAverageLoading] = useState(false);
    const [operation, setOperation] = useState('derive');
    const [expression, setExpression] = useState('');
    const [mathResult, setMathResult] = useState<string | null>(null);
    const [mathError, setMathError] = useState<string | null>(null);
    const [mathLoading, setMathLoading] = useState(false);
    const [isOpOpen, setIsOpOpen] = useState(false);

    const operationsList = [
        { id: 'simplify', label: t('calc.op.simplify') },
        { id: 'factor', label: t('calc.op.factor') },
        { id: 'derive', label: t('calc.op.derive') },
        { id: 'integrate', label: t('calc.op.integrate') },
        { id: 'zeroes', label: t('calc.op.zeroes') },
        { id: 'tangent', label: t('calc.op.tangent') },
        { id: 'area', label: t('calc.op.area') }
    ];

    const handleAddSubject = () => {
        setSubjects([...subjects, { id: Date.now(), name: '', credit: 3, grade: 5 }]);
    };

    const handleRemoveSubject = (id: number) => {
        if (subjects.length > 1) {
            setSubjects(subjects.filter(s => s.id !== id));
        }
    };

    const handleSubjectChange = (id: number, field: keyof Subject, value: string | number) => {
        setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleCalculateAverage = async (e: React.FormEvent) => {
        e.preventDefault();
        setAverageLoading(true);

        try {
            const payload = subjects.map(s => ({
                credit: s.credit,
                grade: s.grade
            }));

            const response = await fetch('http://localhost:8080/api/calculator/weighted-average', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok) {
                setAverageResult(data.average);
            } else {
                console.error("Hiba az átlag számolásakor", data);
            }
        } catch (error) {
            console.error("Hálózati hiba:", error);
        } finally {
            setAverageLoading(false);
        }
    };

    const handleCalculateMath = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expression.trim()) return;

        setMathLoading(true);
        setMathResult(null);
        setMathError(null);

        const token = localStorage.getItem('token');

        try {
            const safeExpression = encodeURIComponent(expression);
            const response = await fetch(`http://localhost:8080/api/tools/calculator/${operation}/${safeExpression}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                setMathError("Kérlek, jelentkezz be a funkció használatához!");
                setMathLoading(false);
                return;
            }

            const data = await response.json();

            if (response.ok && !data.error) {
                setMathResult(data.result);
            } else {
                setMathError(data.error || t('calc.apiError'));
            }
        } catch (error) {
            setMathError(t('calc.connError'));
        } finally {
            setMathLoading(false);
        }
    };

    return (
        <main className="w-full max-w-7xl mx-auto mt-6 pb-12 px-4 grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-20 lg:items-start">
            {/* --- BAL OLDAL: SÚLYOZOTT ÁTLAG / KREDITINDEX --- */}
            <div className="flex flex-col border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[8px_8px_0px_#06b6d4] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] transition-all duration-300 rounded-sm secret:rounded-none h-fit">

                {/* --- Fejléc --- */}
                <div className="bg-cyan-400 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center space-x-3 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-md z-10">
                    <Sigma className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                    <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                        {t('calc.averageTitle')}
                    </h2>
                </div>

                <div className="p-6 flex flex-col">
                    <form onSubmit={handleCalculateAverage} className="flex flex-col">

                        {/* --- Tárgyak listája --- */}
                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {subjects.map((subject, index) => (
                                <div key={subject.id} className="flex space-x-2 items-center bg-white dark:bg-[#121212] secret:bg-transparent p-2 border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] secret:border-dashed shadow-[2px_2px_0px_#000] dark:shadow-sm hover:shadow-[4px_4px_0px_#06b6d4] dark:hover:shadow-md transition-shadow">
                                    <div className="w-6 text-center font-bold text-black dark:text-gray-500 secret:text-[#1cf85d] secret:font-mono">{index + 1}.</div>

                                    <input
                                        type="text"
                                        placeholder={t('calc.subjectPlaceholder')}
                                        value={subject.name}
                                        onChange={(e) => handleSubjectChange(subject.id, 'name', e.target.value)}
                                        className="flex-1 border-b-2 border-black dark:border-gray-700 secret:border-[#1cf85d] bg-transparent outline-none px-2 py-1 text-black dark:text-white secret:text-[#1cf85d] secret:font-mono placeholder:secret:text-[#1cf85d]/50"
                                    />

                                    <div className="w-20">
                                        <label className="text-xs font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase block text-center">{t('calc.credit')}</label>
                                        <input
                                            type="number" min="1" max="30" required
                                            value={subject.credit}
                                            onChange={(e) => handleSubjectChange(subject.id, 'credit', Number(e.target.value))}
                                            className="w-full text-center border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] outline-none secret:font-mono"
                                        />
                                    </div>

                                    <div className="w-20">
                                        <label className="text-xs font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase block text-center">{t('calc.grade')}</label>
                                        <select
                                            value={subject.grade}
                                            onChange={(e) => handleSubjectChange(subject.id, 'grade', Number(e.target.value))}
                                            className="w-full text-center border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] outline-none secret:font-mono cursor-pointer appearance-none"
                                        >
                                            <option value="5">5</option>
                                            <option value="4">4</option>
                                            <option value="3">3</option>
                                            <option value="2">2</option>
                                            <option value="1">1</option>
                                        </select>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSubject(subject.id)}
                                        className="p-2 text-black hover:text-red-600 dark:text-gray-500 secret:text-[#1cf85d]/50 secret:hover:text-[#1cf85d] transition-colors cursor-pointer"
                                        title={t('calc.delete')}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 flex flex-col space-y-4">
                            <button
                                type="button"
                                onClick={handleAddSubject}
                                className="w-full border-4 border-dashed border-black dark:border-[#a855f7] secret:border-[#1cf85d] text-black dark:text-[#c084fc] secret:text-[#1cf85d] font-bold py-2 flex items-center justify-center hover:bg-cyan-400 dark:hover:bg-[#a855f7]/10 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer secret:font-mono uppercase shadow-[4px_4px_0px_#000] dark:shadow-none"
                            >
                                <Plus className="w-6 h-6 mr-1" /> {t('calc.addSubject')}
                            </button>

                            <button
                                type="submit"
                                disabled={averageLoading}
                                className="w-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-4 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50 shadow-[4px_4px_0px_#000] dark:shadow-md"
                            >
                                <Calculator className="w-5 h-5 mr-2 font-bold" />
                                {averageLoading ? t('calc.calculating') : t('calc.calculateAvg')}
                            </button>
                        </div>
                    </form>

                    {/* --- Eredmény --- */}
                    {averageResult !== null && (
                        <div className="mt-6 p-4 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#1e1e1e] secret:bg-black flex flex-col items-center justify-center shadow-[6px_6px_0px_#06b6d4] dark:shadow-inner animate-[fadeIn_0.5s_ease-out]">
                            <span className="text-black dark:text-gray-400 secret:text-[#1cf85d]/70 font-bold uppercase tracking-wider text-sm secret:font-mono">
                                {t('calc.avgResult')}
                            </span>
                            <span className="text-5xl font-black text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] mt-2 drop-shadow-none dark:drop-shadow-md secret:drop-shadow-[0_0_8px_rgba(28,248,93,0.8)] secret:font-mono">
                                {averageResult}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* --- JOBB OLDAL: OKOS SZÁMOLÓGÉP --- */}
            <div className="flex flex-col border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[8px_8px_0px_#d946ef] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] transition-all duration-300 rounded-sm secret:rounded-none h-fit w-full">

                {/* --- Fejléc --- */}
                <div className="bg-fuchsia-400 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center space-x-3 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-md z-10">
                    <FunctionSquare className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                    <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                        {t('calc.mathTitle')}
                    </h2>
                </div>

                <div className="p-5.5 flex flex-col">
                    <form onSubmit={handleCalculateMath} className="flex flex-col space-y-5">

                        {/* --- Művelet kiválasztása --- */}
                        <div className={`flex flex-col group relative ${isOpOpen ? 'z-50' : 'z-10'}`}>
                            <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                                {t('calc.operation')}
                            </label>

                            <button
                                type="button"
                                onClick={() => setIsOpOpen(!isOpOpen)}
                                className="flex items-center justify-between w-full border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] cursor-pointer shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none secret:font-mono uppercase text-lg font-bold transition-colors hover:border-fuchsia-500 focus:border-fuchsia-500"
                            >
                                <span>{operationsList.find(op => op.id === operation)?.label}</span>
                                <ChevronDown className={`w-6 h-6 transition-transform ${isOpOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isOpOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsOpOpen(false)}></div>
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-lg z-50 max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
                                        {operationsList.map(op => (
                                            <button
                                                key={op.id}
                                                type="button"
                                                onClick={() => {
                                                    setOperation(op.id);
                                                    setIsOpOpen(false);
                                                }}
                                                className={`text-left p-3 font-bold text-lg cursor-pointer transition-colors secret:font-mono uppercase ${operation === op.id ? 'bg-cyan-400 dark:bg-[#a855f7] secret:bg-[#1cf85d] text-black dark:text-white secret:text-black' : 'text-black dark:text-white secret:text-[#1cf85d] hover:bg-fuchsia-400 dark:hover:bg-gray-800 secret:hover:bg-[#1cf85d]/20'}`}
                                            >
                                                {op.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* --- Kifejezés megadása --- */}
                        <div className="flex flex-col group">
                            <label className="text-sm font-bold text-black dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-fuchsia-600 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                                {t('calc.expression')}
                            </label>
                            <input
                                type="text"
                                required
                                value={expression}
                                onChange={(e) => setExpression(e.target.value)}
                                placeholder="x^2+2x"
                                className="border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-transparent dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-inner secret:shadow-none text-lg font-bold secret:font-mono placeholder:secret:text-[#1cf85d]/50"
                            />
                        </div>
                        <div className="pt-3.5">
                            <button
                                type="submit"
                                disabled={mathLoading}
                                className="w-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-4 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50 shadow-[4px_4px_0px_#000] dark:shadow-md"
                            >
                                <FunctionSquare className="w-5 h-5 mr-2 font-bold" />
                                {mathLoading ? t('calc.processing') : t('calc.compute')}
                            </button>
                        </div>
                    </form>

                    {/* --- Hibaüzenet --- */}
                    {mathError && (
                        <div className="mt-4 bg-fuchsia-400 dark:bg-red-900/40 secret:bg-black border-4 border-black dark:border-red-500 secret:border-[#1cf85d] text-black dark:text-red-300 secret:text-[#1cf85d] p-4 font-bold text-sm transition-colors shadow-[4px_4px_0px_#000] dark:shadow-sm secret:font-mono uppercase">
                            &gt; {mathError}
                        </div>
                    )}

                    {/* --- Eredmény --- */}
                    {mathResult !== null && !mathError && (
                        <div className="mt-4 p-4 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#1e1e1e] secret:bg-black shadow-[6px_6px_0px_#d946ef] dark:shadow-inner animate-[fadeIn_0.5s_ease-out]">
                            <div className="flex flex-col">
                                <span className="text-xs text-black dark:text-gray-400 secret:text-[#1cf85d]/70 uppercase font-bold mb-1 secret:font-mono">{t('calc.input')}</span>
                                <span className="text-lg font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono mb-3 border-b-4 border-black dark:border-gray-800 secret:border-[#1cf85d]/30 pb-2 overflow-x-auto custom-scrollbar">
                                    {expression}
                                </span>

                                <span className="text-xs text-black dark:text-[#e879f9] secret:text-[#1cf85d] uppercase font-bold mb-1 secret:font-mono mt-2">{t('calc.result')}</span>
                                <div className="flex items-center text-2xl font-black text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono overflow-x-auto custom-scrollbar drop-shadow-none dark:drop-shadow-sm secret:drop-shadow-[0_0_8px_rgba(28,248,93,0.8)]">
                                    <ArrowRight className="w-6 h-6 mr-2 shrink-0 font-bold text-black dark:text-[#c084fc]" />
                                    <span>{mathResult}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}