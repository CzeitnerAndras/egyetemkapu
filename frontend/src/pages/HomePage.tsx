import { useState, useEffect } from 'react';
import { Save, Trash2, X } from 'lucide-react';

interface EventItem {
  id: number;
  title: string;
  description: string;
  eventDate?: string;
  createdAt?: string;
  imageUrl?: string;
}

interface NoteItem {
  id?: number;
  content: string;
}

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNews, setSelectedNews] = useState<EventItem | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteId, setNoteId] = useState<number | null>(null);

  useEffect(() => {
    {/* --- Hírek lekérése (GET) --- */}
    fetch('http://localhost:8080/api/events')
      .then((res) => {
        if (!res.ok) throw new Error('Hiba a hírek lekérésekor');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setEvents(data);
        } else {
          setEvents([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Hiba az események lekérésekor:', err);
        setEvents([]);
        setLoading(false);
      });

    {/* --- Jegyzetek lekérése (GET) - Privát --- */}
    const token = localStorage.getItem('token');
    if (token) {
      fetch('http://localhost:8080/api/notes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error('Nincs jogosultság vagy lejárt token');
          return res.json();
        })
        .then((notes) => {
          if (Array.isArray(notes) && notes.length > 0) {
            setNoteContent(notes[0].content);
            setNoteId(notes[0].id || null);
          }
        })
        .catch((err) => console.error('Hiba a jegyzetek lekérésekor:', err));
    }
  }, []);

  {/* --- Jegyzet mentése (POST/PUT) --- */}
  const handleSaveNote = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('A jegyzet mentéséhez be kell jelentkezned!');
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    if (noteId) {
      {/* --- Frissítés (PUT) --- */}
      fetch(`http://localhost:8080/api/notes/${noteId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content: noteContent }),
      })
        .then((res) => res.json())
        .then(() => alert('Jegyzet sikeresen frissítve!'))
        .catch((err) => console.error('Hiba a mentéskor:', err));
    } else {
      {/* --- Új létrehozása (POST) --- */}
      fetch('http://localhost:8080/api/notes', {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: noteContent }),
      })
        .then((res) => res.json())
        .then((newNote: NoteItem) => {
          setNoteId(newNote.id || null);
          alert('Jegyzet sikeresen elmentve!');
        })
        .catch((err) => console.error('Hiba a mentéskor:', err));
    }
  };

  {/* --- Jegyzet törlése (DELETE) --- */}
  const handleDeleteNote = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setNoteContent('');
      return;
    }

    if (noteId) {
      fetch(`http://localhost:8080/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(() => {
          setNoteContent('');
          setNoteId(null);
          alert('Jegyzet törölve!');
        })
        .catch((err) => console.error('Hiba a törléskor:', err));
    } else {
      setNoteContent('');
    }
  };

  return (
    <main className="w-full px-6 lg:px-16 mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-10 relative">

      {/* --- Bal oldal: Hírek --- */}
      <div className="lg:col-span-2 space-y-6 h-[550px] overflow-y-auto pt-4 pl-2 pr-4 pb-4 custom-scrollbar">
        {loading ? (
          <div className="text-[#800000] dark:text-[#c084fc] font-bold p-4">Hírek betöltése a szerverről...</div>
        ) : events.length === 0 ? (
          <div className="text-gray-600 dark:text-gray-400 p-4 border-2 border-dashed border-[#800000] dark:border-[#a855f7]">
            Jelenleg nincs feltöltött hír az adatbázisban.
          </div>
        ) : (
          events.map((item) => (
            <div
              key={item.id}
              className="flex border-2 border-[#800000] dark:border-[#a855f7] bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] h-52 hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(128,0,0,0.15)] dark:hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedNews(item)}
            >
              <div className="w-52 shrink-0 border-r-2 border-[#800000] dark:border-[#a855f7] flex items-center justify-center bg-[#06261b] dark:bg-black/60 overflow-hidden transition-colors relative">
                <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none"></div>
                
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-white font-bold">KÉP</span>
                )}
              </div>

              <div className="flex-1 p-6 flex flex-col overflow-hidden relative">
                <h2 className="text-2xl font-bold border-b-2 border-[#800000] dark:border-[#a855f7] text-[#800000] dark:text-[#c084fc] pb-2 mb-3 hover:text-red-600 dark:hover:text-[#e879f9] transition-colors truncate">
                  {item.title}
                </h2>
                <p className="text-[#800000] dark:text-gray-300 text-md flex-grow line-clamp-3">
                  {item.description}
                </p>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                  {item.eventDate ? new Date(item.eventDate).toLocaleDateString('hu-HU') : 'Nincs megadva dátum'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- Jobb oldal: Jegyzetfüzet --- */}
      <div className="lg:col-span-1 border-2 border-black dark:border-[#a855f7] bg-gradient-to-br from-[#fefce8] to-[#fef3c7] dark:from-[#1e1e1e] dark:to-[#2b184a] relative flex flex-col h-[550px] shadow-[4px_4px_15px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[4px_4px_25px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_0_35px_rgba(168,85,247,0.35)] transition-all duration-300">
        <textarea
          className="w-full h-full bg-transparent resize-none outline-none px-4 py-2 notepad-lines text-black dark:text-gray-100"
          placeholder="Ide írhatod a jegyzeteket..."
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
        ></textarea>

        <div className="absolute bottom-2 right-2 flex space-x-2">
          <button
            onClick={handleDeleteNote}
            className="p-2 bg-red-600 text-white rounded hover:bg-red-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            title="Törlés"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleSaveNote}
            className="p-2 bg-[#800000] dark:bg-[#a855f7] text-white rounded hover:bg-red-800 dark:hover:bg-[#c084fc] hover:shadow-[0_0_15px_rgba(168,85,247,0.6)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            title="Mentés"
          >
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- Felugró ablak (Modal) --- */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-[#fdfbf7] to-[#f4ebe1] dark:from-[#1e1e1e] dark:to-[#2b184a] border-4 border-[#800000] dark:border-[#a855f7] w-full max-w-4xl rounded-sm p-8 relative shadow-[0_20px_50px_rgba(128,0,0,0.2)] dark:shadow-[0_0_50px_rgba(168,85,247,0.5)] flex flex-col max-h-[90vh] overflow-y-auto transition-colors">
            
            <button
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 text-[#800000] dark:text-[#a855f7] hover:text-red-600 dark:hover:text-[#c084fc] transition-colors bg-transparent rounded-full z-10 cursor-pointer"
            >
              <X className="w-8 h-8" />
            </button>

            <h1 className="text-4xl font-bold text-[#800000] dark:text-[#c084fc] mb-4 mt-2">{selectedNews.title}</h1>
            <span className="text-md font-bold text-gray-500 dark:text-gray-400 mb-6 block border-b-2 border-gray-300 dark:border-gray-600 pb-2">
              Dátum: {selectedNews.eventDate ? new Date(selectedNews.eventDate).toLocaleDateString('hu-HU') : 'Nincs dátum'}
            </span>

            <p className="text-gray-800 dark:text-gray-200 text-xl leading-relaxed text-justify whitespace-pre-wrap">
              {selectedNews.description}
            </p>

          </div>
        </div>
      )}

    </main>
  );
}