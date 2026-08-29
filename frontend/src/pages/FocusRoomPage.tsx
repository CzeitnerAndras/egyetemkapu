import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Plus, Circle, Coffee, BrainCircuit, Headphones, FileText, Save } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface Task {
    id: number;
    title: string;
    taskType: string;
    deadline: string | number[];
    completed: boolean;
    pingDayBefore: boolean;
    pingOnDay: boolean;
}

export default function FocusRoomPage() {
    const { t } = useLanguage();
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [noteContent, setNoteContent] = useState('');
    const [noteId, setNoteId] = useState<number | null>(null);
    const [isSavingNote, setIsSavingNote] = useState(false);

    {/* --- Időzítő logikája --- */ }
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (isFocusMode) {
                alert(t('focus.focusEnded'));
                handleSetMode(false);
            } else {
                alert(t('focus.breakEnded'));
                handleSetMode(true);
            }
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft, isFocusMode, t]);

    {/* --- Feladatok és Jegyzet lekérése betöltéskor --- */ }
    useEffect(() => {
        const token = localStorage.getItem('token');

        {/* --- Feladatok lekérése --- */ }
        const fetchTasks = async () => {
            try {
                const res = await fetch('/api/tasks', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data: Task[] = await res.json();
                    setTasks(data.filter(t => !t.completed));
                }
            } catch (error) {
                console.error("Hiba a feladatok betöltésekor:", error);
            } finally {
                setIsLoadingTasks(false);
            }
        };

        {/* --- Jegyzet lekérése --- */ }
        const fetchNote = async () => {
            try {
                const res = await fetch('/api/notes', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setNoteId(data[0].id);
                        setNoteContent(data[0].content);
                    }
                }
            } catch (error) {
                console.error("Hiba a jegyzet betöltésekor:", error);
            }
        };

        fetchTasks();
        fetchNote();
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(isFocusMode ? 25 * 60 : 5 * 60);
    };

    const handleSetMode = (focus: boolean) => {
        setIsActive(false);
        setIsFocusMode(focus);
        setTimeLeft(focus ? 25 * 60 : 5 * 60);
    };

    {/* --- Backend: Feladat Hozzáadása --- */ }
    const addTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const token = localStorage.getItem('token');
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const localDeadline = todayEnd.toISOString().split('.')[0];

        const newTaskObj = {
            title: newTaskTitle,
            taskType: 'Fókusz',
            deadline: localDeadline,
            completed: false,
            pingDayBefore: false,
            pingOnDay: false
        };

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTaskObj)
            });

            if (res.ok) {
                const createdTask = await res.json();
                setTasks([...tasks, createdTask]);
                setNewTaskTitle('');
            }
        } catch (error) {
            console.error("Hiba a feladat létrehozásakor:", error);
        }
    };

    {/* --- Backend: Feladat Kész --- */ }
    const toggleTask = async (id: number) => {
        const taskToUpdate = tasks.find(t => t.id === id);
        if (!taskToUpdate) return;

        let safeDeadline = taskToUpdate.deadline;
        if (Array.isArray(safeDeadline)) {
            const [y, m, d, h, min, s] = safeDeadline;
            safeDeadline = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h || 0).padStart(2, '0')}:${String(min || 0).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
        }

        const updatedTask = { ...taskToUpdate, deadline: safeDeadline, completed: true };
        const token = localStorage.getItem('token');
        const previousTasks = [...tasks];
        setTasks(tasks.filter(t => t.id !== id));

        try {
            const res = await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedTask)
            });

            if (!res.ok) {
                setTasks(previousTasks);
            }
        } catch (error) {
            console.error("Hiba a feladat frissítésekor:", error);
            setTasks(previousTasks);
        }
    };

    {/* --- Backend: Jegyzet Mentése --- */ }
    const saveNote = async () => {
        setIsSavingNote(true);
        const token = localStorage.getItem('token');
        try {
            if (noteId) {
                await fetch(`/api/notes/${noteId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: noteContent })
                });
            } else {
                const res = await fetch('/api/notes', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content: noteContent })
                });
                if (res.ok) {
                    const data = await res.json();
                    setNoteId(data.id);
                }
            }
        } catch (error) {
            console.error("Hiba a jegyzet mentésekor:", error);
        } finally {
            setIsSavingNote(false);
        }
    };

    return (
        <main className="w-full max-w-7xl mx-auto mt-6 pb-12 px-4 relative z-20">

            <div className="flex items-center space-x-3 mb-8 bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-[4px_4px_0px_#000] dark:shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
                <BrainCircuit className="w-8 h-8 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase">
                    <span className="secret:hidden">{t('focus.title')}</span>
                    <span className="hidden secret:inline">Neural Link Active</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- Pomodoro Időzítő és Notes --- */}
                <div className="lg:col-span-1 flex flex-col space-y-6 h-[500px]">

                    {/* --- Pomodoro --- */}
                    <div className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#d946ef] dark:shadow-md secret:rounded-none flex flex-col items-center justify-center shrink-0">
                        <div className="flex w-full border-4 border-black dark:border-gray-700 secret:border-[#1cf85d] bg-white rounded-full secret:rounded-none overflow-hidden mb-6 shadow-[4px_4px_0px_#000] dark:shadow-none">
                            <button
                                onClick={() => handleSetMode(true)}
                                className={`flex-1 py-2 font-bold flex items-center justify-center transition-colors secret:font-mono uppercase cursor-pointer border-r-4 border-black dark:border-gray-700 secret:border-[#1cf85d]
                                    ${isFocusMode
                                        ? 'bg-fuchsia-400 dark:bg-[#a855f7] text-black dark:text-white secret:bg-[#1cf85d] secret:text-black'
                                        : 'bg-white dark:bg-[#121212] text-black dark:text-gray-400 secret:bg-black secret:text-[#1cf85d] hover:bg-gray-100 dark:hover:bg-gray-800 secret:hover:bg-[#1cf85d]/20'
                                    }`}
                            >
                                <BrainCircuit className="w-5 h-5 mr-2" /> {t('focus.focus')}
                            </button>
                            <button
                                onClick={() => handleSetMode(false)}
                                className={`flex-1 py-2 font-bold flex items-center justify-center transition-colors secret:font-mono uppercase cursor-pointer
                                    ${!isFocusMode
                                        ? 'bg-cyan-400 dark:bg-blue-500 text-black dark:text-white secret:bg-[#1cf85d] secret:text-black'
                                        : 'bg-white dark:bg-[#121212] text-black dark:text-gray-400 secret:bg-black secret:text-[#1cf85d] hover:bg-gray-100 dark:hover:bg-gray-800 secret:hover:bg-[#1cf85d]/20'
                                    }`}
                            >
                                <Coffee className="w-5 h-5 mr-2" /> {t('focus.break')}
                            </button>
                        </div>

                        <div className={`text-6xl xl:text-7xl font-black tracking-wider mb-8 tabular-nums secret:font-mono dark:drop-shadow-md secret:drop-shadow-[0_0_10px_rgba(28,248,93,0.8)]
                            ${isFocusMode ? 'text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d]' : 'text-cyan-600 dark:text-blue-400 secret:text-[#1cf85d]'}`}>
                            {formatTime(timeLeft)}
                        </div>

                        <div className="flex space-x-4 w-full">
                            <button
                                onClick={toggleTimer}
                                className={`flex-1 py-3 font-bold text-black dark:text-white secret:text-black border-4 border-black dark:border-transparent secret:border-[#1cf85d] transition-transform hover:-translate-y-1 shadow-[4px_4px_0px_#000] dark:shadow-md secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] flex items-center justify-center cursor-pointer secret:font-mono uppercase
                                    ${isActive
                                        ? 'bg-fuchsia-400 dark:bg-orange-500 secret:bg-orange-500 secret:text-black secret:border-orange-500'
                                        : 'bg-cyan-400 dark:bg-green-600 secret:bg-[#1cf85d]'}`}
                            >
                                {isActive ? <><Pause className="w-6 h-6 mr-1" /> {t('focus.pause')}</> : <><Play className="w-6 h-6 mr-1" /> {t('focus.start')}</>}
                            </button>
                            <button
                                onClick={resetTimer}
                                className="p-3 bg-white dark:bg-gray-700 secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] hover:bg-cyan-400 dark:hover:bg-gray-600 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer shadow-[4px_4px_0px_#000] dark:shadow-md"
                                title={t('focus.reset')}
                            >
                                <RotateCcw className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* --- Notes --- */}
                    <div className="bg-white dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-[6px_6px_0px_#06b6d4] dark:shadow-md secret:rounded-none flex flex-col flex-1 min-h-0">
                        <div className="flex items-center justify-between mb-3 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                            <div className="flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                                <h2 className="text-lg font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                                    {t('focus.quickNote')}
                                </h2>
                            </div>
                            <button
                                onClick={saveNote}
                                disabled={isSavingNote}
                                className="text-black dark:text-gray-400 secret:text-[#1cf85d] hover:text-fuchsia-600 dark:hover:text-[#c084fc] secret:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                                title={t('focus.save')}
                            >
                                <Save className="w-6 h-6" />
                            </button>
                        </div>
                        <textarea
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder={t('focus.notePlaceholder')}
                            className="flex-1 w-full resize-none outline-none bg-slate-50 border-4 border-black p-2 shadow-inner dark:bg-transparent dark:border-transparent dark:shadow-none text-black dark:text-white secret:text-[#1cf85d] secret:font-mono placeholder-gray-400 dark:placeholder-gray-600 secret:placeholder-[#1cf85d]/30 font-medium"
                        />
                    </div>
                </div>

                {/* --- Naptár Feladatai --- */}
                <div className="lg:col-span-1 bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#d946ef] dark:shadow-md secret:rounded-none flex flex-col h-[500px]">
                    <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2 mb-4 secret:font-mono uppercase">
                        {t('focus.activeTasks')}
                    </h2>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                        {isLoadingTasks ? (
                            <p className="text-center text-gray-500 secret:text-[#1cf85d]/50 secret:font-mono uppercase font-bold">{t('focus.loading')}</p>
                        ) : tasks.length === 0 ? (
                            <p className="text-center text-gray-500 secret:text-[#1cf85d]/50 secret:font-mono uppercase mt-4 font-bold">{t('focus.noTasks')}</p>
                        ) : (
                            tasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => toggleTask(task.id)}
                                    className="flex items-center p-3 border-4 mb-3 cursor-pointer transition-all secret:rounded-none bg-white dark:bg-[#2a2a2a] secret:bg-transparent border-black dark:border-[#a855f7]/50 secret:border-[#1cf85d] hover:shadow-[4px_4px_0px_#06b6d4] hover:-translate-y-1 shadow-[2px_2px_0px_#000] dark:shadow-none dark:hover:shadow-none dark:hover:translate-y-0 dark:hover:border-[#a855f7] secret:hover:bg-[#1cf85d]/10"
                                >
                                    <div className="mr-3">
                                        <Circle className="w-5 h-5 text-black dark:text-gray-500 secret:text-[#1cf85d]/70 hover:text-green-600 secret:hover:text-[#1cf85d]" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm md:text-base font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">
                                            {task.title}
                                        </span>
                                        <span className="text-xs text-black dark:text-gray-500 secret:text-[#1cf85d]/60 font-black uppercase">
                                            {t(`cal.type.${task.taskType}`) || task.taskType}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={addTask} className="mt-4 pt-4 border-t-4 border-black dark:border-gray-700 secret:border-[#1cf85d] flex">
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            placeholder={t('focus.addTask')}
                            className="flex-1 border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] mr-2 p-2 outline-none bg-white dark:bg-transparent dark:text-white secret:text-[#1cf85d] secret:font-mono placeholder-gray-400 secret:placeholder-[#1cf85d]/30 font-bold shadow-[4px_4px_0px_#000] dark:shadow-none"
                        />
                        <button
                            type="submit"
                            className="bg-cyan-400 dark:bg-[#a855f7] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] px-4 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] hover:bg-fuchsia-400 secret:hover:bg-[#1cf85d] secret:hover:text-black transition-colors cursor-pointer flex items-center justify-center shadow-[4px_4px_0px_#000] dark:shadow-none"
                        >
                            <Plus className="w-6 h-6 font-bold" />
                        </button>
                    </form>
                </div>

                {/* --- Lo-Fi lejátszó --- */}
                <div className="lg:col-span-1 bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#d946ef] dark:shadow-md secret:rounded-none flex flex-col h-[500px]">
                    <div className="flex items-center mb-4 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                        <Headphones className="w-6 h-6 mr-2 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                            {t('focus.radio')}
                        </h2>
                    </div>

                    <div className="flex-1 border-4 border-black dark:border-gray-700 secret:border-[#1cf85d] bg-black relative shadow-[4px_4px_0px_#000] dark:shadow-none">
                        <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/53gNFOqDFcE?autoplay=0&controls=1"
                            title="lofi hip hop radio"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0"
                        ></iframe>
                    </div>

                    <p className="text-xs text-center font-bold text-black dark:text-gray-400 secret:text-[#1cf85d]/60 mt-4 secret:font-mono uppercase">
                        {t('focus.music')}
                    </p>
                </div>

            </div>
        </main>
    );
}