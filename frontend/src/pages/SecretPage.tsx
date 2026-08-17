import { Link } from 'react-router-dom';

export default function SecretPage() {
    return (
        <main className="min-h-[calc(100vh-80px)] bg-[#031e08] text-[#1cf85d] font-mono p-8 relative flex flex-col items-center justify-center selection:bg-[#1cf85d] selection:text-black">

            {/* --- CRT Scanline (vízszintes csíkozás) --- */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.4)_50%)] bg-[length:100%_4px] pointer-events-none z-10"></div>

            {/* --- Vignette effekt (sötétedő képernyősarkok) --- */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.9)_100%)] pointer-events-none z-10"></div>

            {/* --- Terminál tartalom (Foszfor ragyogás text-shadow-val) --- */}
            <div className="w-full max-w-4xl z-20 relative text-lg md:text-xl leading-relaxed [text-shadow:0_0_6px_rgba(28,248,93,0.5)]">

                {/* --- Fejléc --- */}
                <div className="text-center mb-8">
                    <p>BANDI INDUSTRIES UNIFIED OPERATING SYSTEM</p>
                    <p>COPYRIGHT 2075-2077 BANDI INDUSTRIES</p>
                    <p>-Server 76-</p>
                </div>

                {/* --- Alfejléc --- */}
                <div className="mb-6">
                    <p>-BANDI Trespasser Management System-</p>
                    <p>=========================================</p>
                    <p className="invisible">Ures sor</p>
                    <p>=========================================</p>
                </div>

                {/* --- Log adatok --- */}
                <div className="mb-6 space-y-1">
                    <p>| User Log:</p>
                    <p>| &gt;&gt; Administrator: UNKOWN</p>
                    <p>| &gt;&gt; Helpdesk</p>
                    <p>|========</p>
                </div>

                {/* --- Interaktív rész --- */}
                <div className="mt-8 space-y-2">
                    <div className="pt-6 flex flex-col space-y-2">
                        <button className="text-left w-fit px-2 py-1 hover:bg-[#1cf85d] hover:text-black transition-none cursor-pointer uppercase">
                            run:// search valami
                        </button>
                        <button className="text-left w-fit px-2 py-1 hover:bg-[#1cf85d] hover:text-black transition-none cursor-pointer uppercase">
                            run:// search valami más
                        </button>
                    </div>
                </div>

                <div className="mt-16">
                    <Link to="/" className="text-left w-fit px-2 py-1 hover:bg-[#1cf85d] hover:text-black transition-none cursor-pointer uppercase block">
                        &lt;&lt; Logoff
                    </Link>
                </div>
            </div>
        </main>
    );
}