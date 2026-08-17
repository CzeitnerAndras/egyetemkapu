import { Link } from 'react-router-dom';

export default function SecretPage() {
    return (
        <main className="min-h-[calc(100vh-80px)] bg-black text-[#00ff41] font-mono p-8 relative overflow-hidden flex flex-col items-center justify-center selection:bg-[#00ff41] selection:text-black">

            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-10"></div>

            <div className="border border-[#00ff41] bg-black p-6 w-full max-w-4xl shadow-[0_0_15px_#00ff41] z-20">
                <div className="border-b border-[#00ff41] pb-2 mb-4 flex justify-between">
                    <span>SYSTEM_OVERRIDE_INITIATED</span>
                    <span>v.2077.4</span>
                </div>

                <div className="space-y-4">
                    <p className="animate-pulse">&gt; Csatlakozás a szerverhez...</p>
                    <p>&gt; Hitelesítés: SIKERES</p>
                    <p>&gt; Üdvözöllek a Hálózatban, User_9942.</p>

                    <div className="mt-8 pt-8 border-t border-[#00ff41]/30">
                        <p className="text-sm text-[#00ff41]/70 mb-4">// Válassz menüpontot a folytatáshoz:</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button className="border border-[#00ff41] p-3 hover:bg-[#00ff41] hover:text-black transition-colors text-left cursor-pointer">
                                [1] Még kitalálom, de valami menü lesz itt
                            </button>
                            <button className="border border-[#00ff41] p-3 hover:bg-[#00ff41] hover:text-black transition-colors text-left cursor-pointer">
                                [2] Itt is lesz valami, de még nem tudom, hogy mi
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Link to="/" className="mt-8 z-20 text-[#00ff41]/50 hover:text-[#00ff41] underline cursor-pointer">
                &lt;&lt; Visszatérés a normál rendszerbe
            </Link>

        </main>
    );
}