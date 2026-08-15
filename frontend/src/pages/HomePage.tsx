import { useState, useEffect } from 'react';
import { Save, Trash2, X } from 'lucide-react';

interface EventItem {
  id: number;
  title: string;
  description: string;
  eventDate?: string;
  createdAt?: string;
}

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNews, setSelectedNews] = useState<EventItem | null>(null);

  useEffect(() => {
    fetch('http://localhost:8080/api/events')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Hiba a szerver válaszában');
        }
        return res.json();
      })
      .then((data: EventItem[]) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Hiba az események/hírek lekérésekor:', err);
        setLoading(false);
      });
  }, []);

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
            <div key={item.id} className="flex border-2 border-[#800000] bg-[#fdfbf7] h-40 hover:shadow-lg transition-shadow">
              
              <div className="w-1/3 border-r-2 border-[#800000] flex items-center justify-center text-[#800000] font-bold bg-gray-100">
                KÉP
              </div>
              
              <div className="w-2/3 p-4 flex flex-col">
                <h2 
                  onClick={() => setSelectedNews(item)}
                  className="text-xl font-bold border-b-2 border-[#800000] text-[#800000] pb-1 mb-2 cursor-pointer hover:text-red-600 transition-colors"
                >
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
        ></textarea>
        
        <div className="absolute bottom-2 right-2 flex space-x-2">
          <button className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm">
            <Trash2 className="w-5 h-5" />
          </button>
          <button className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm">
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* --- Felugró ablak (Modal) --- */}
      {selectedNews && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          
          <div className="bg-[#fdfbf7] border-4 border-[#800000] w-full max-w-3xl rounded-sm p-6 relative shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setSelectedNews(null)}
              className="absolute top-4 right-4 text-[#800000] hover:text-red-600 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="w-full h-64 bg-gray-200 border-2 border-[#800000] flex items-center justify-center text-gray-500 font-bold text-xl mb-6 mt-4">
              KÉP (Nagy felbontás)
            </div>

            <h1 className="text-3xl font-bold text-[#800000] mb-2">{selectedNews.title}</h1>
            <span className="text-sm font-bold text-gray-500 mb-4 block border-b-2 border-gray-300 pb-2">
              Dátum: {selectedNews.eventDate ? new Date(selectedNews.eventDate).toLocaleDateString('hu-HU') : 'Nincs dátum'}
            </span>

            <p className="text-gray-800 text-lg leading-relaxed text-justify">
              {selectedNews.description}
            </p>
            
          </div>
        </div>
      )}

    </main>
  );
}