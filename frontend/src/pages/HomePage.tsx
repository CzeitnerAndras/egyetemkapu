import { Save, Trash2 } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="max-w-7xl mx-auto p-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">

      {/* --- Bal oldal: Hírek --- */}
      <div className="md:col-span-2 space-y-4">
        <div className="flex border-2 border-[#800000] bg-[#fdfbf7] h-48">
          <div className="w-1/3 border-r-2 border-[#800000] flex items-center justify-center text-[#800000] font-bold">
            KÉP
          </div>
          <div className="w-2/3 p-4 flex flex-col">
            <h2 className="text-xl font-bold border-b-2 border-[#800000] text-[#800000] pb-2 mb-2">CÍM</h2>
            <p className="text-[#800000]">Leírás...</p>
          </div>
        </div>
      </div>

      {/* --- Jobb oldal: Jegyzetfüzet --- */}
      <div className="md:col-span-1 border-2 border-black bg-[#fefce8] relative flex flex-col h-125">
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
          <button className="p-2 bg-red-600 text-white rounded hover:bg-red-700">
            <Trash2 className="w-5 h-5" />
          </button>
          <button className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>

    </main>
  );
}