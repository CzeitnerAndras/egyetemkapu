import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Bell, Trash2, Calendar as CalendarIcon, Plus } from 'lucide-react';

interface Task {
    id?: number;
    title: string;
    taskType: string;
    deadline: string;
    completed: boolean;
    pingDayBefore: boolean;
    pingOnDay: boolean;
}

export default function CalendarPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    {/* --- Űrlap state-ek --- */ }
    const [title, setTitle] = useState('');
    const [taskType, setTaskType] = useState('Vizsga');
    const [time, setTime] = useState('08:00');
    const [pingDayBefore, setPingDayBefore] = useState(false);
    const [pingOnDay, setPingOnDay] = useState(false);
    const [loading, setLoading] = useState(true);

    {/* --- Adatok lekérése JWT tokennel --- */ }
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        fetch('http://localhost:8080/api/tasks', {
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

    const monthNames = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
    const dayNames = ["Hé", "Ke", "Sze", "Csü", "Pé", "Szo", "Vas"];

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

        const token = localStorage.getItem('token');
        if (!token) {
            alert('A teendő mentéséhez be kell jelentkezned!');
            return;
        }

        const newTask = {
            title,
            taskType,
            deadline: formatDateForApi(selectedDate, time),
            completed: false,
            pingDayBefore,
            pingOnDay
        };

        fetch('http://localhost:8080/api/tasks', {
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
            })
            .catch(err => console.error('Mentési hiba:', err));
    };

    {/* --- Törlés JWT tokennel --- */ }
    const handleDeleteTask = (id: number) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        fetch(`http://localhost:8080/api/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (res.ok) {
                    setTasks(tasks.filter(t => t.id !== id));
                }
            })
            .catch(err => console.error('Törlési hiba:', err));
    };

    return (
        <main className="w-full max-w-7xl mx-auto mt-6 px-4 grid grid-cols-1 lg:grid-cols-3 gap-6 relative">

            {/* --- BAL OLDAL: NAPTÁR --- */}
            <div className="lg:col-span-2 flex flex-col border-4 border-[#800000] dark:border-[#a855f7] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] shadow-[0_20px_50px_rgba(128,0,0,0.15)] dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] transition-all duration-300 rounded-sm">
                <div className="bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#1e1e1e] dark:to-[#3b0764] p-4 flex items-center justify-between border-b-4 border-black dark:border-[#a855f7] shadow-md z-10 text-white">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer">
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="flex items-center space-x-2">
                        <CalendarIcon className="w-6 h-6 drop-shadow-md" />
                        <h2 className="text-2xl font-bold drop-shadow-md uppercase tracking-wider">
                            {currentDate.getFullYear()}. {monthNames[currentDate.getMonth()]}
                        </h2>
                    </div>

                    <button onClick={nextMonth} className="p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 flex-1">
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {dayNames.map(day => (
                            <div key={day} className="text-center font-bold text-[#800000] dark:text-[#a855f7] text-lg">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: firstDay }).map((_, index) => (
                            <div key={`empty-${index}`} className="h-16 lg:h-20 rounded-sm bg-black/5 dark:bg-white/5 opacity-50"></div>
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
                                    className={`h-16 lg:h-20 relative cursor-pointer border-2 transition-all duration-300 flex flex-col items-center justify-center
                                        ${isSelected
                                            ? 'border-[#800000] dark:border-[#a855f7] bg-white dark:bg-[#121212] shadow-[0_5px_15px_rgba(128,0,0,0.3)] dark:shadow-[0_0_20px_rgba(168,85,247,0.5)] scale-105 z-10'
                                            : 'border-transparent bg-white/50 dark:bg-[#121212]/50 hover:border-[#800000]/50 dark:hover:border-[#a855f7]/50 hover:bg-white dark:hover:bg-[#121212] shadow-sm'
                                        }
                                    `}
                                >
                                    <span className={`text-xl font-bold ${isToday ? 'text-red-600 dark:text-[#e879f9]' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {day}
                                    </span>

                                    {hasTask && (
                                        <div className="absolute bottom-1 w-2.5 h-2.5 rounded-full bg-[#800000] dark:bg-[#a855f7] shadow-[0_0_8px_rgba(128,0,0,0.8)] dark:shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- JOBB OLDAL: TENNIVALÓK ÉS ŰRLAP --- */}
            <div className="lg:col-span-1 flex flex-col space-y-4">
                <div className="border-4 border-[#800000] dark:border-[#a855f7] bg-gradient-to-br from-[#fefce8] to-[#fef3c7] dark:from-[#1e1e1e] dark:to-[#2b184a] shadow-[4px_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(168,85,247,0.15)] flex flex-col h-[260px]">
                    <div className="bg-[#800000] dark:bg-[#2e1065] text-white p-2 font-bold text-center border-b-4 border-black dark:border-[#a855f7]">
                        {selectedDate.toLocaleDateString('hu-HU')} Teendői
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {loading ? (
                            <p className="text-center text-gray-500">Töltés...</p>
                        ) : getTasksForSelectedDate().length === 0 ? (
                            <p className="text-center text-gray-500 dark:text-gray-400 font-medium mt-6 text-sm">Ezen a napon nincsenek teendőid.</p>
                        ) : (
                            getTasksForSelectedDate().map(task => (
                                <div key={task.id} className="bg-white dark:bg-[#121212] border-2 border-black dark:border-gray-600 p-2 shadow-sm hover:shadow-md transition-shadow relative group">
                                    <h3 className="font-bold text-sm text-[#800000] dark:text-[#c084fc] pr-6 truncate">{task.title}</h3>
                                    <div className="flex justify-between items-center mt-1 text-xs text-gray-600 dark:text-gray-300">
                                        <span className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded font-medium">{task.taskType}</span>
                                        <span>{new Date(task.deadline).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>

                                    {(task.pingDayBefore || task.pingOnDay) && (
                                        <div className="absolute top-2 right-8 text-indigo-500 dark:text-indigo-400" title="Discord értesítés beállítva">
                                            <Bell className="w-4 h-4" />
                                        </div>
                                    )}

                                    <button
                                        onClick={() => task.id && handleDeleteTask(task.id)}
                                        className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* --- Új teendő hozzáadása --- */}
                <form onSubmit={handleSaveTask} className="border-4 border-[#800000] dark:border-[#a855f7] bg-white dark:bg-[#121212] shadow-[0_10px_30px_rgba(128,0,0,0.1)] dark:shadow-[0_0_30px_rgba(168,85,247,0.2)] p-4 flex flex-col space-y-3">
                    <h3 className="text-lg font-bold text-[#800000] dark:text-[#c084fc] border-b-2 border-[#800000] dark:border-[#a855f7] pb-1">
                        Új bejegyzés rögzítése
                    </h3>

                    <div className="flex flex-col group">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Esemény neve</label>
                        <input required type="text" value={title} onChange={e => setTitle(e.target.value)}
                            className="border-2 border-black dark:border-gray-600 p-1.5 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] bg-transparent dark:text-white transition-colors text-sm"
                        />
                    </div>

                    <div className="flex space-x-3">
                        <div className="flex flex-col flex-1">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Típus</label>
                            <select value={taskType} onChange={e => setTaskType(e.target.value)}
                                className="border-2 border-black dark:border-gray-600 p-1.5 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] bg-white dark:bg-[#121212] dark:text-white cursor-pointer text-sm"
                            >
                                <option>Vizsga</option>
                                <option>Beadandó</option>
                                <option>Egyéb</option>
                            </select>
                        </div>
                        <div className="flex flex-col w-1/3">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Időpont</label>
                            <input required type="time" value={time} onChange={e => setTime(e.target.value)}
                                className="border-2 border-black dark:border-gray-600 p-1.5 outline-none focus:border-[#800000] dark:focus:border-[#e879f9] bg-transparent dark:text-white text-sm"
                            />
                        </div>
                    </div>

                    {/* --- Discord ping beállítások --- */}
                    <div className="bg-gray-100 dark:bg-[#1a1a1a] p-2 border-2 border-indigo-200 dark:border-indigo-900 space-y-1 mt-1">
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center mb-1.5">
                            <Bell className="w-3.5 h-3.5 mr-1" /> Discord Értesítések
                        </p>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={pingDayBefore} onChange={e => setPingDayBefore(e.target.checked)} className="w-3.5 h-3.5 cursor-pointer accent-[#800000] dark:accent-[#a855f7]" />
                            <span className="text-xs dark:text-gray-300">Ping 1 nappal előtte</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={pingOnDay} onChange={e => setPingOnDay(e.target.checked)} className="w-3.5 h-3.5 cursor-pointer accent-[#800000] dark:accent-[#a855f7]" />
                            <span className="text-xs dark:text-gray-300">Ping aznap reggel</span>
                        </label>
                    </div>

                    <button type="submit" className="w-full bg-gradient-to-r from-[#800000] to-[#b91c1c] dark:from-[#7e22ce] dark:to-[#a855f7] text-white font-bold py-2 mt-1 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(128,0,0,0.3)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all duration-300 border-2 border-black dark:border-transparent flex items-center justify-center cursor-pointer text-sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Mentés a naptárba
                    </button>
                </form>
            </div>
        </main>
    );
}