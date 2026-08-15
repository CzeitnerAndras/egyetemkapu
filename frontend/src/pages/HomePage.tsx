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
      .then((res) => res.json())
      .then((data: EventItem[]) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Hiba az események lekérésekor:', err);
        setLoading(false);
      });

    {/* --- Jegyzetek lekérése (GET) --- */}
    fetch('http://localhost:8080/api/notes')
      .then((res) => res.json())
      .then((notes: NoteItem[]) => {
        if (notes && notes.length > 0) {
          setNoteContent(notes[0].content);
          setNoteId(notes[0].id || null);
        }
      })
      .catch((err) => console.error('Hiba a jegyzetek lekérésekor:', err));
  }, []);

  {/* --- Jegyzet mentése (POST/PUT) --- */}
  const handleSaveNote = () => {
    if (noteId) {
      {/* --- Frissítés (PUT) --- */}
      fetch(`http://localhost:8080/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      })
        .then((res) => res.json())
        .then(() => alert('Jegyzet sikeresen frissítve!'))
        .catch((err) => console.error('Hiba a mentéskor:', err));
    } else {
      {/* --- Új létrehozása (POST) --- */}
      fetch('http://localhost:8080/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (noteId) {
      fetch(`http://localhost:8080/api/notes/${noteId}`, {
        method: 'DELETE',
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
    <main className="max-w-7xl mx-auto p-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 relative">

      {/* --- Bal oldal: Hírek --- */}
      <div className="md:col-span-2 space-y-4 max-h-125 overflow-y-auto pr-2">
        {loading ? (
          <div className="text-[#800000] font-bold p-4">Hírek betöltése a szerverről...</div>
        ) : events.length === 0 ? (
          <div className="text-gray-600 p-4 border-2 border-dashed border-[#800000]">
            Jelenleg nincs feltöltött hír az adatbázisban.
          </div>
        ) : (
          events.map((item) => (
            <div key={item.id} className="flex border-2 border-[#800000] bg-[#fdfbf7] h-40 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedNews(item)}>
              
              <div className="w-1/3 border-r-2 border-[#800000] flex items-center justify-center bg-gray-100 overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#800000] font-bold">KÉP</span>
                )}
              </div>
              
              <div className="w-2/3 p-4 flex flex-col">
                <h2 className="text-xl font-bold border-b-2 border-[#800000] text-[#800000] pb-1 mb-2 hover:text-red-600 transition-colors">
                  {item.title}
                </h2>
                <p className="text-[#800000] text-sm grow line-clamp-2">
                  {item.description}
                </p>
                <span className="text-xs text-gray-500 mt-2 font-medium">
                  {item.eventDate ? new Date(item.eventDate).toLocaleDateString('hu-HU') : 'Nincs megadva dátum'}
                </span>
              </div>

            </div>
          ))
        )}
      </div>

      {/* --- Jobb oldal: Jegyzetfüzet --- */}
      <div className="md:col-span-1 border-2 border-black bg-[#fefce8] relative flex flex-col h-125 shadow-md">
        <textarea 
          className="w-full h-full bg-transparent resize-none outline-none px-4 py-2"
          style={{ 
            lineHeight: '32px',
            backgroundImage: 'linear-gradient(transparent, transparent 31px, #ccc 31px, #ccc 32px)',
            backgroundSize: '100% 32px',
            backgroundAttachment: 'local'
          }}
          placeholder="Ide írhatod a jegyzeteket..."
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
        ></textarea>
        
        <div className="absolute bottom-2 right-2 flex space-x-2">
          <button 
            onClick={handleDeleteNote}
            className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
            title="Törlés"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSaveNote}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            title="Mentés"
          >
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- Felugró ablak (Modal) --- */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          
          <div className="bg-[#fdfbf7] border-4 border-[#800000] w-full max-w-3xl rounded-sm p-8 relative shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 text-[#800000] hover:text-red-600 transition-colors bg-[#fdfbf7] rounded-full z-10 cursor-pointer"
            >
              <X className="w-8 h-8" />
            </button>

            <h1 className="text-3xl font-bold text-[#800000] mb-2 mt-2">{selectedNews.title}</h1>
            <span className="text-sm font-bold text-gray-500 mb-6 block border-b-2 border-gray-300 pb-2">
              Dátum: {selectedNews.eventDate ? new Date(selectedNews.eventDate).toLocaleDateString('hu-HU') : 'Nincs dátum'}
            </span>

            <p className="text-gray-800 text-lg leading-relaxed text-justify whitespace-pre-wrap">
              {selectedNews.description}
            </p>
            
          </div>
        </div>
      )}

    </main>
  );
}