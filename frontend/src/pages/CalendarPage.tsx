import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bell, Trash2, Calendar as CalendarIcon, Plus, Clock, Send } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface Task {
    id?: number;
    title: string;
    taskType: string;
    deadline: string;
    completed: boolean;
    pingDayBefore: boolean;
    pingOnDay: boolean;
    pingTelegramDayBefore?: boolean;
    pingTelegramOnDay?: boolean;
}

export default function CalendarPage() {
    const { t, locale } = useLanguage();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [title, setTitle] = useState('');
    const [taskType, setTaskType] = useState('');
    const [time, setTime] = useState('08:00');
    const [pingDayBefore, setPingDayBefore] = useState(false);
    const [pingOnDay, setPingOnDay] = useState(false);
    const [pingTelegramDayBefore, setPingTelegramDayBefore] = useState(false);
    const [pingTelegramOnDay, setPingTelegramOnDay] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isTimeOpen, setIsTimeOpen] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    {/* --- Adatok lekérése JWT tokennel --- */ }
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        fetch('/api/tasks', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Nincs jogosultság a feladatok lekéréséhez');
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setTasks(data);
                } else {
                    setTasks([]);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Hiba a feladatok lekérésekor:', err);
                setLoading(false);
            });
    }, []);

    {/* --- Naptár logikák --- */ }
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        let day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    const monthNames = [
        t('cal.month.0'), t('cal.month.1'), t('cal.month.2'), t('cal.month.3'),
        t('cal.month.4'), t('cal.month.5'), t('cal.month.6'), t('cal.month.7'),
        t('cal.month.8'), t('cal.month.9'), t('cal.month.10'), t('cal.month.11')
    ];

    const dayNames = [
        t('cal.day.0'), t('cal.day.1'), t('cal.day.2'), t('cal.day.3'),
        t('cal.day.4'), t('cal.day.5'), t('cal.day.6')
    ];

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    {/* --- Dátum formázó segédek --- */ }
    const formatDateForApi = (date: Date, timeStr: string) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}T${timeStr}:00`;
    };

    const isSameDay = (date1: Date, date2: Date) => {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

    const getTasksForSelectedDate = () => {
        return tasks.filter(task => {
            const taskDate = new Date(task.deadline);
            return isSameDay(taskDate, selectedDate);
        });
    };

    const hasTaskOnDate = (day: number) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return tasks.some(task => isSameDay(new Date(task.deadline), checkDate));
    };

    {/* --- Mentés JWT tokennel --- */ }
    const handleSaveTask = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        const token = localStorage.getItem('token');
        if (!token) {
            setMessage({ text: t('cal.needLogin') || 'A teendő mentéséhez be kell jelentkezned!', type: 'error' });
            return;
        }

        const newTask = {
            title,
            taskType: taskType || 'Egyéb',
            deadline: formatDateForApi(selectedDate, time),
            completed: false,
            pingDayBefore,
            pingOnDay,
            pingTelegramDayBefore,
            pingTelegramOnDay
        };

        fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newTask)
        })
            .then(res => {
                if (!res.ok) throw new Error('Mentés sikertelen');
                return res.json();
            })
            .then(savedTask => {
                setTasks([...tasks, savedTask]);
                setTitle('');
                setTaskType('');
                setMessage({ text: 'Sikeresen mentve!', type: 'success' });
                setTimeout(() => setMessage(null), 3000);
            })
            .catch(err => {
                console.error('Mentési hiba:', err);
                setMessage({ text: 'Hiba történt a mentés során.', type: 'error' });
            });
    };

    {/* --- Törlés JWT tokennel --- */ }
    const handleDeleteTask = (id: number) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setMessage({ text: t('cal.needLogin') || 'A törléshez be kell jelentkezned!', type: 'error' });
            return;
        }

        fetch(`/api/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.ok) {
                    setTasks(tasks.filter(t => t.id !== id));
                    setMessage({ text: 'Sikeresen törölve!', type: 'success' });
                    setTimeout(() => setMessage(null), 3000);
                }
            })
            .catch(err => {
                console.error('Törlési hiba:', err);
                setMessage({ text: 'Hiba történt a törlés során.', type: 'error' });
            });
    };

    return (
        <main className="w-full max-w-7xl mx-auto mt-6 pb-12 px-4 grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-20 lg:items-stretch">

            {/* --- BAL OLDAL: NAPTÁR --- */}
            <div className="lg:col-span-2 flex flex-col h-full border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[8px_8px_0px_#06b6d4] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.2)] transition-all duration-300 rounded-sm">
                <div className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center justify-between border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-md z-10 text-black dark:text-white secret:text-[#1cf85d]">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/20 secret:hover:bg-[#1cf85d] secret:hover:text-black rounded-full secret:rounded-none transition-colors cursor-pointer">
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="flex items-center space-x-2">
                        <CalendarIcon className="w-6 h-6 dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                        <h2 className="text-2xl font-bold dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] uppercase tracking-wider secret:font-mono">
                            {currentDate.getFullYear()}. {monthNames[currentDate.getMonth()]}
                        </h2>
                    </div>

                    <button onClick={nextMonth} className="p-2 hover:bg-white/20 secret:hover:bg-[#1cf85d] secret:hover:text-black rounded-full secret:rounded-none transition-colors cursor-pointer">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 flex-1 flex flex-col min-h-0">
                    <div className="grid grid-cols-7 gap-2 mb-2 shrink-0">
                        {dayNames.map(day => (
                            <div key={day} className="text-center font-bold text-black dark:text-[#a855f7] secret:text-[#1cf85d] text-lg uppercase secret:font-mono">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr min-h-0">
                        {Array.from({ length: firstDay }).map((_, index) => (
                            <div key={`empty-${index}`} className="min-h-16 lg:min-h-24 h-full rounded-sm bg-black/5 dark:bg-white/5 secret:bg-transparent opacity-50"></div>
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, index) => {
                            const day = index + 1;
                            const isToday = isSameDay(new Date(), new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                            const isSelected = isSameDay(selectedDate, new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                            const hasTask = hasTaskOnDate(day);

                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                                    className={`min-h-16 lg:min-h-24 h-full relative cursor-pointer border-2 transition-all duration-300 flex flex-col items-center justify-center secret:font-mono
                                        ${isSelected
                                            ? 'border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-cyan-400 dark:bg-[#121212] secret:bg-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-[0_0_20px_rgba(168,85,247,0.5)] secret:shadow-[0_0_15px_rgba(28,248,93,0.5)] scale-105 z-10'
                                            : 'border-transparent secret:border-[#1cf85d]/30 bg-white/50 dark:bg-[#121212]/50 secret:bg-transparent hover:border-black dark:hover:border-[#a855f7]/50 secret:hover:border-[#1cf85d] hover:bg-white dark:hover:bg-[#121212] secret:hover:bg-[#1cf85d] secret:hover:text-black shadow-sm group'
                                        }
                                    `}
                                >
                                    <span className={`text-2xl lg:text-3xl font-bold 
                                        ${isToday ? 'text-fuchsia-600 dark:text-[#e879f9] secret:text-white' : 'text-black dark:text-gray-200 secret:text-[#1cf85d]'} 
                                        ${isSelected ? 'secret:text-black' : 'group-hover:secret:text-black'}
                                    `}>
                                        {day}
                                    </span>

                                    {hasTask && (
                                        <div className={`absolute bottom-1 w-2.5 h-2.5 rounded-full secret:rounded-none animate-pulse shadow-[2px_2px_0px_#000] dark:shadow-[0_0_8px_rgba(168,85,247,0.8)] secret:shadow-[0_0_8px_rgba(28,248,93,1)]
                                            ${isSelected ? 'bg-fuchsia-600 dark:bg-[#a855f7] secret:bg-black' : 'bg-fuchsia-600 dark:bg-[#a855f7] secret:bg-[#1cf85d] group-hover:secret:bg-black'}
                                        `}></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- JOBB OLDAL: TENNIVALÓK ÉS ŰRLAP --- */}
            <div className="lg:col-span-1 flex flex-col space-y-4 h-full">
                <div className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent shadow-[6px_6px_0px_#d946ef] dark:shadow-[0_0_20px_rgba(168,85,247,0.15)] flex flex-col flex-1 min-h-[260px]">
                    <div className="bg-cyan-400 dark:bg-[#3b0764] secret:bg-[#1cf85d] text-black dark:text-white secret:text-black p-2 font-bold text-center border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] uppercase secret:font-mono">
                        {t('cal.tasksOf', { date: selectedDate.toLocaleDateString(locale) })}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {loading ? (
                            <p className="text-center text-gray-500 secret:text-[#1cf85d] secret:font-mono">{t('cal.loading')}</p>
                        ) : getTasksForSelectedDate().length === 0 ? (
                            <p className="text-center text-gray-500 dark:text-gray-400 secret:text-[#1cf85d]/70 font-medium mt-6 text-sm secret:font-mono uppercase">&gt; <span>{t('cal.noTasks')}</span></p>
                        ) : (
                            getTasksForSelectedDate().map(task => (
                                <div key={task.id} className="bg-white dark:bg-[#121212] secret:bg-black border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 shadow-[2px_2px_0px_#000] dark:shadow-sm hover:shadow-[4px_4px_0px_#06b6d4] dark:hover:shadow-md transition-shadow relative group">
                                    <h3 className="font-bold text-sm text-fuchsia-600 dark:text-[#c084fc] secret:text-[#1cf85d] pr-6 truncate secret:font-mono">&gt; {task.title}</h3>
                                    <div className="flex justify-between items-center mt-1 text-xs text-gray-600 dark:text-gray-300 secret:text-[#1cf85d]/80 secret:font-mono">
                                        <span className="bg-gray-200 dark:bg-gray-800 secret:bg-[#1cf85d] secret:text-black px-2 py-0.5 rounded secret:rounded-none font-medium uppercase border-black dark:border-transparent border-2">
                                            {task.taskType}
                                        </span>
                                        <span>{new Date(task.deadline).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    {(task.pingDayBefore || task.pingOnDay) && (
                                        <div className="absolute top-2 right-12 text-indigo-500 dark:text-indigo-400 secret:text-[#1cf85d]" title={t('cal.discordSet')}>
                                            <Bell className="w-4 h-4" />
                                        </div>
                                    )}

                                    {(task.pingTelegramDayBefore || task.pingTelegramOnDay) && (
                                        <div className="absolute top-2 right-8 text-cyan-500 dark:text-cyan-400 secret:text-[#1cf85d]" title="Telegram értesítés beállítva">
                                            <Send className="w-4 h-4" />
                                        </div>
                                    )}

                                    <button
                                        onClick={() => task.id && handleDeleteTask(task.id)}
                                        className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-600 secret:text-[#1cf85d]/50 secret:hover:text-[#1cf85d] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* --- Új teendő hozzáadása --- */}
                <form onSubmit={handleSaveTask} className="border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-[#121212] secret:bg-transparent shadow-[6px_6px_0px_#06b6d4] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] flex flex-col">
                    <div className="bg-fuchsia-400 dark:bg-[#3b0764] secret:bg-[#1cf85d] text-black dark:text-white secret:text-black p-2 font-bold text-center border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] uppercase secret:font-mono">
                        {t('cal.newEntry')}
                    </div>

                    <div className="p-4 flex flex-col space-y-3">

                        {message && (
                            <div className={`p-2 font-bold text-xs border-2 shadow-[2px_2px_0px_#000] dark:shadow-sm secret:shadow-none secret:font-mono uppercase ${message.type === 'success'
                                ? 'bg-green-400 dark:bg-green-900/40 border-black dark:border-green-600 text-black dark:text-green-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]'
                                : 'bg-red-400 dark:bg-red-900/40 border-black dark:border-red-600 text-black dark:text-red-300 secret:bg-black secret:border-[#1cf85d] secret:text-[#1cf85d]'
                                }`}>
                                &gt; <span>{message.text}</span>
                            </div>
                        )}

                        <div className="flex flex-col group">
                            <label className="text-xs font-bold text-black dark:text-gray-300 secret:text-[#1cf85d] mb-1 uppercase secret:font-mono">{t('cal.eventName')}</label>
                            <input required type="text" value={title} onChange={e => setTitle(e.target.value)}
                                className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-1.5 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white bg-white dark:bg-[#121212] dark:text-white secret:text-[#1cf85d] transition-colors text-sm secret:font-mono"
                            />
                        </div>

                        <div className="flex space-x-3">
                            <div className="flex flex-col flex-1">
                                <label className="text-xs font-bold text-black dark:text-gray-300 secret:text-[#1cf85d] mb-1 uppercase secret:font-mono">{t('cal.type')}</label>
                                <input required type="text" value={taskType} onChange={e => setTaskType(e.target.value)}
                                    placeholder={t('cal.typePlaceholder')}
                                    className="border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-1.5 outline-none focus:border-fuchsia-500 dark:focus:border-[#e879f9] secret:focus:border-white bg-white dark:bg-[#121212] dark:text-white secret:text-[#1cf85d] transition-colors text-sm secret:font-mono"
                                />
                            </div>

                            {/* --- Időválasztó --- */}
                            <div className={`flex flex-col w-1/3 relative ${isTimeOpen ? 'z-50' : 'z-10'}`}>
                                <label className="text-xs font-bold text-black dark:text-gray-300 secret:text-[#1cf85d] mb-1 uppercase secret:font-mono">{t('cal.time')}</label>
                                <button
                                    type="button"
                                    onClick={() => setIsTimeOpen(!isTimeOpen)}
                                    className="flex items-center justify-between w-full border-2 border-black dark:border-gray-600 secret:border-[#1cf85d] p-1.5 outline-none bg-white dark:bg-[#121212] text-black dark:text-white secret:text-[#1cf85d] text-sm secret:font-mono cursor-pointer transition-colors hover:border-fuchsia-500 focus:border-fuchsia-500"
                                >
                                    <span>{time}</span>
                                    <Clock className="w-4 h-4 ml-1" />
                                </button>

                                {isTimeOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsTimeOpen(false)}></div>
                                        <div className="absolute top-full mt-1 right-0 w-48 bg-white dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-lg z-50 flex flex-col">
                                            <div className="flex h-40 border-b-4 border-black dark:border-gray-600 secret:border-[#1cf85d]">
                                                {/* --- Óra --- */}
                                                <div className="flex-1 overflow-y-auto custom-scrollbar border-r-4 border-black dark:border-gray-600 secret:border-[#1cf85d]">
                                                    {Array.from({ length: 24 }).map((_, i) => {
                                                        const h = i.toString().padStart(2, '0');
                                                        const currentHour = time.split(':')[0] || '08';
                                                        return (
                                                            <button
                                                                key={`h-${h}`}
                                                                type="button"
                                                                onClick={() => setTime(`${h}:${time.split(':')[1] || '00'}`)}
                                                                className={`w-full p-2 text-center font-bold text-sm cursor-pointer transition-colors secret:font-mono ${currentHour === h ? 'bg-cyan-400 dark:bg-[#a855f7] secret:bg-[#1cf85d] text-black dark:text-white' : 'text-black dark:text-white secret:text-[#1cf85d] hover:bg-fuchsia-400 dark:hover:bg-gray-800 secret:hover:bg-[#1cf85d]/20'}`}
                                                            >
                                                                {h}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {/* --- Perc --- */}
                                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                                    {Array.from({ length: 60 }).map((_, i) => {
                                                        const m = i.toString().padStart(2, '0');
                                                        const currentMinute = time.split(':')[1] || '00';
                                                        return (
                                                            <button
                                                                key={`m-${m}`}
                                                                type="button"
                                                                onClick={() => setTime(`${time.split(':')[0] || '08'}:${m}`)}
                                                                className={`w-full p-2 text-center font-bold text-sm cursor-pointer transition-colors secret:font-mono ${currentMinute === m ? 'bg-cyan-400 dark:bg-[#a855f7] secret:bg-[#1cf85d] text-black dark:text-white' : 'text-black dark:text-white secret:text-[#1cf85d] hover:bg-fuchsia-400 dark:hover:bg-gray-800 secret:hover:bg-[#1cf85d]/20'}`}
                                                            >
                                                                {m}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsTimeOpen(false)}
                                                className="w-full bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold p-2 hover:bg-cyan-400 dark:hover:bg-[#a855f7] secret:hover:bg-[#1cf85d] hover:text-black transition-colors uppercase text-sm secret:font-mono cursor-pointer"
                                            >
                                                OK
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* --- Discord ping beállítások --- */}
                        <div className="bg-white dark:bg-[#1a1a1a] secret:bg-transparent p-2 border-2 border-black dark:border-indigo-900 secret:border-[#1cf85d] space-y-1 mt-1">
                            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 secret:text-[#1cf85d] flex items-center mb-1.5 uppercase secret:font-mono">
                                <Bell className="w-3.5 h-3.5 mr-1" /> {t('cal.discord')}
                            </p>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={pingDayBefore} onChange={e => setPingDayBefore(e.target.checked)} className="w-3.5 h-3.5 cursor-pointer accent-cyan-500 dark:accent-[#a855f7] secret:accent-[#1cf85d]" />
                                <span className="text-xs font-bold dark:font-normal text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono uppercase">{t('cal.pingBefore')}</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={pingOnDay} onChange={e => setPingOnDay(e.target.checked)} className="w-3.5 h-3.5 cursor-pointer accent-cyan-500 dark:accent-[#a855f7] secret:accent-[#1cf85d]" />
                                <span className="text-xs font-bold dark:font-normal text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono uppercase">{t('cal.pingDay')}</span>
                            </label>
                        </div>

                        {/* --- Telegram ping beállítások --- */}
                        <div className="bg-white dark:bg-[#1a1a1a] secret:bg-transparent p-2 border-2 border-black dark:border-cyan-900 secret:border-[#1cf85d] space-y-1 mt-1">
                            <p className="text-xs font-bold text-cyan-700 dark:text-cyan-400 secret:text-[#1cf85d] flex items-center mb-1.5 uppercase secret:font-mono">
                                <Send className="w-3.5 h-3.5 mr-1" /> Telegram
                            </p>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={pingTelegramDayBefore} onChange={e => setPingTelegramDayBefore(e.target.checked)} className="w-3.5 h-3.5 cursor-pointer accent-cyan-500 dark:accent-[#a855f7] secret:accent-[#1cf85d]" />
                                <span className="text-xs font-bold dark:font-normal text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono uppercase">{t('cal.pingBefore')}</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" checked={pingTelegramOnDay} onChange={e => setPingTelegramOnDay(e.target.checked)} className="w-3.5 h-3.5 cursor-pointer accent-cyan-500 dark:accent-[#a855f7] secret:accent-[#1cf85d]" />
                                <span className="text-xs font-bold dark:font-normal text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono uppercase">{t('cal.pingDay')}</span>
                            </label>
                        </div>

                        <p className="text-[10px] font-bold text-black/70 dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono leading-snug">
                            {t('cal.pingLangHint')}
                        </p>

                        <button type="submit" className="w-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:from-[#7e22ce] dark:to-[#a855f7] secret:bg-none secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] font-bold py-2 mt-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_#000] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] secret:hover:shadow-[0_0_15px_rgba(28,248,93,0.5)] transition-all duration-300 border-4 border-black dark:border-transparent secret:border-[#1cf85d] secret:hover:bg-[#1cf85d] secret:hover:text-black flex items-center justify-center cursor-pointer text-sm secret:font-mono uppercase">
                            <Plus className="w-5 h-5 mr-1 font-bold" />
                            {t('cal.save')}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}