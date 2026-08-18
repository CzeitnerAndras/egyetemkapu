import { useState } from 'react';
import { Calculator, Sigma, Plus, Trash2, FunctionSquare, ArrowRight } from 'lucide-react';

interface Subject {
    id: number;
    name: string;
    credit: number;
    grade: number;
}

export default function CalculatorPage() {
    const [subjects, setSubjects] = useState<Subject[]>([{ id: Date.now(), name: '', credit: 3, grade: 5 }, { id: Date.now() + 1, name: '', credit: 3, grade: 5 }]);
    const [averageResult, setAverageResult] = useState<number | null>(null);
    const [averageLoading, setAverageLoading] = useState(false);
    const [operation, setOperation] = useState('derive');
    const [expression, setExpression] = useState('');
    const [mathResult, setMathResult] = useState<string | null>(null);
    const [mathError, setMathError] = useState<string | null>(null);
    const [mathLoading, setMathLoading] = useState(false);

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

        try {
            const safeExpression = encodeURIComponent(expression);
            const response = await fetch(`http://localhost:8080/api/tools/calculator/${operation}/${safeExpression}`);
            const data = await response.json();

            if (response.ok && !data.error) {
                setMathResult(data.result);
            } else {
                setMathError(data.error || 'A matematikai API hibát jelzett.');
            }
        } catch (error) {
            setMathError('Hiba a szerverhez való kapcsolódás során.');
        } finally {
            setMathLoading(false);
        }
    };

    return (
        <main className="w-full max-w-7xl mx-auto mt-6 pb-12 px-4 grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-20 lg:items-start">            
            {/* --- BAL OLDAL: SÚLYOZOTT ÁTLAG / KREDITINDEX --- */}
            <div className="flex flex-col border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[0_20px_50px_rgba(128,0,0,0.15)] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] transition-all duration-300 rounded-sm secret:rounded-none h-fit">

                {/* --- Fejléc --- */}
                <div className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center space-x-3 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] shadow-md z-10">
                    <Sigma className="w-8 h-8 text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                    <h2 className="text-xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                        Súlyozott Átlag / Kreditindex
                    </h2>
                </div>

                <div className="p-6 flex flex-col">
                    <form onSubmit={handleCalculateAverage} className="flex flex-col">

                        {/* --- Tárgyak listája --- */}
                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {subjects.map((subject, index) => (
                                <div key={subject.id} className="flex space-x-2 items-center bg-white dark:bg-[#121212] secret:bg-transparent p-2 border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] secret:border-dashed shadow-sm">
                                    <div className="w-6 text-center font-bold text-gray-500 secret:text-[#1cf85d] secret:font-mono">{index + 1}.</div>

                                    <input
                                        type="text"
                                        placeholder="Tantárgy neve (opcionális)"
                                        value={subject.name}
                                        onChange={(e) => handleSubjectChange(subject.id, 'name', e.target.value)}
                                        className="flex-1 border-b-2 border-gray-300 dark:border-gray-700 secret:border-[#1cf85d] bg-transparent outline-none px-2 py-1 text-black dark:text-white secret:text-[#1cf85d] secret:font-mono placeholder:secret:text-[#1cf85d]/50"
                                    />

                                    <div className="w-20">
                                        <label className="text-xs font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase block text-center">Kredit</label>
                                        <input
                                            type="number" min="1" max="30" required
                                            value={subject.credit}
                                            onChange={(e) => handleSubjectChange(subject.id, 'credit', Number(e.target.value))}
                                            className="w-full text-center border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-transparent text-black dark:text-white secret:text-[#1cf85d] outline-none secret:font-mono"
                                        />
                                    </div>

                                    <div className="w-20">
                                        <label className="text-xs font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono uppercase block text-center">Érdemjegy</label>
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
                                        className="p-2 text-gray-500 hover:text-red-600 secret:text-[#1cf85d]/50 secret:hover:text-[#1cf85d] transition-colors cursor-pointer"
                                        title="Törlés"
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
                                className="w-full border-2 border-dashed border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] font-bold py-2 flex items-center justify-center hover:bg-[#800000]/10 dark:hover:bg-[#a855f7]/10 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer secret:font-mono uppercase"
                            >
                                <Plus className="w-5 h-5 mr-1" /> Új tárgy hozzáadása
                            </button>

                            <button
                                type="submit"
                                disabled={averageLoading}
                                className="w-full bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-2 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50"
                            >
                                <Calculator className="w-5 h-5 mr-2" />
                                {averageLoading ? 'Számolás...' : 'Átlag Kiszámítása'}
                            </button>
                        </div>
                    </form>

                    {/* --- Eredmény --- */}
                    {averageResult !== null && (
                        <div className="mt-6 p-4 border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#1e1e1e] secret:bg-black flex flex-col items-center justify-center shadow-inner animate-[fadeIn_0.5s_ease-out]">
                            <span className="text-gray-600 dark:text-gray-400 secret:text-[#1cf85d]/70 font-bold uppercase tracking-wider text-sm secret:font-mono">
                                Súlyozott átlag eredménye
                            </span>
                            <span className="text-5xl font-black text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mt-2 drop-shadow-md secret:drop-shadow-[0_0_8px_rgba(28,248,93,0.8)] secret:font-mono">
                                {averageResult}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* --- JOBB OLDAL: OKOS SZÁMOLÓGÉP --- */}
            <div className="flex flex-col border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[0_20px_50px_rgba(128,0,0,0.15)] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] transition-all duration-300 rounded-sm secret:rounded-none h-fit w-full">

                {/* --- Fejléc --- */}
                <div className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center space-x-3 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] shadow-md z-10">
                    <FunctionSquare className="w-8 h-8 text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                    <h2 className="text-xl font-bold text-white secret:text-[#1cf85d] drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                        Komplex API Számológép
                    </h2>
                </div>

                <div className="p-6 flex flex-col">
                    <form onSubmit={handleCalculateMath} className="flex flex-col space-y-5">

                        {/* --- Művelet kiválasztása --- */}
                        <div className="flex flex-col group">
                            <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                                Művelet
                            </label>
                            <select
                                value={operation}
                                onChange={(e) => setOperation(e.target.value)}
                                className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] cursor-pointer appearance-none shadow-inner secret:shadow-none secret:font-mono uppercase text-lg"
                            >
                                <option value="simplify">Egyszerűsítés (Simplify)</option>
                                <option value="factor">Faktorizálás (Factor)</option>
                                <option value="derive">Deriválás (Derive)</option>
                                <option value="integrate">Integrálás (Integrate)</option>
                                <option value="zeroes">Zérushelyek (Zeroes)</option>
                                <option value="tangent">Érintő (Tangent 2|x^3)</option>
                                <option value="area">Terület (Area 2:4|x^3)</option>
                            </select>
                        </div>

                        {/* --- Kifejezés megadása --- */}
                        <div className="flex flex-col group">
                            <label className="text-sm font-bold text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] mb-1 group-focus-within:text-red-700 dark:group-focus-within:text-white secret:group-focus-within:text-white transition-colors secret:font-mono uppercase">
                                Kifejezés (pl. x^2+2x)
                            </label>
                            <input
                                type="text"
                                required
                                value={expression}
                                onChange={(e) => setExpression(e.target.value)}
                                placeholder="x^2+2x"
                                className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-3 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] secret:focus:border-white focus:ring-4 focus:ring-[#800000]/10 dark:focus:ring-[#a855f7]/30 secret:focus:ring-transparent bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] shadow-inner secret:shadow-none text-lg font-bold secret:font-mono placeholder:secret:text-[#1cf85d]/50"
                            />
                        </div>
                        <div className="pt-3.5">
                            <button
                                type="submit"
                                disabled={mathLoading}
                                className="w-full bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-white secret:text-[#1cf85d] font-bold py-3 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all duration-300 border-2 border-black dark:border-transparent secret:border-[#1cf85d] flex items-center justify-center cursor-pointer secret:font-mono uppercase disabled:opacity-50"
                            >
                                <FunctionSquare className="w-5 h-5 mr-2" />
                                {mathLoading ? 'Feldolgozás...' : 'Számítás'}
                            </button>
                        </div>
                    </form>

                    {/* --- Hibaüzenet --- */}
                    {mathError && (
                        <div className="mt-4 bg-red-100 dark:bg-red-900/40 secret:bg-black border-l-4 border-red-600 dark:border-red-500 secret:border-[#1cf85d] text-red-700 dark:text-red-300 secret:text-[#1cf85d] p-4 font-medium text-sm transition-colors shadow-sm secret:font-mono uppercase">
                            &gt; Hiba: {mathError}
                        </div>
                    )}

                    {/* --- Eredmény --- */}
                    {mathResult !== null && !mathError && (
                        <div className="mt-4 p-4 border-4 border-[#800000] dark:border-[#a855f7] secret:border-[#1cf85d] bg-white dark:bg-[#1e1e1e] secret:bg-black shadow-inner animate-[fadeIn_0.5s_ease-out]">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/70 uppercase font-bold mb-1 secret:font-mono">Megadás:</span>
                                <span className="text-lg font-medium text-black dark:text-white secret:text-[#1cf85d] secret:font-mono mb-3 border-b-2 border-gray-200 dark:border-gray-800 secret:border-[#1cf85d]/30 pb-2 overflow-x-auto custom-scrollbar">
                                    {expression}
                                </span>

                                <span className="text-xs text-green-700 dark:text-[#e879f9] secret:text-[#1cf85d] uppercase font-bold mb-1 secret:font-mono">Eredmény:</span>
                                <div className="flex items-center text-2xl font-black text-[#800000] dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono overflow-x-auto custom-scrollbar drop-shadow-sm secret:drop-shadow-[0_0_8px_rgba(28,248,93,0.8)]">
                                    <ArrowRight className="w-6 h-6 mr-2 shrink-0" />
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