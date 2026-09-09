import { type ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function NoticeModal({
    open,
    onClose,
    title,
    children,
    confirmLabel,
    closeLabel,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    confirmLabel: string;
    closeLabel: string;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="notice-modal-title"
                className="bg-slate-100 dark:bg-[#1e1e1e] secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] w-full max-w-lg p-6 shadow-[10px_10px_0px_#000] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] secret:shadow-[0_0_30px_rgba(28,248,93,0.3)]"
            >
                <div className="flex items-start justify-between gap-3 mb-4 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <AlertTriangle className="w-7 h-7 shrink-0 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                        <h2 id="notice-modal-title" className="text-xl font-bold uppercase secret:font-mono leading-tight text-black dark:text-white secret:text-[#1cf85d]">
                            {title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] cursor-pointer hover:bg-cyan-400 secret:hover:bg-[#1cf85d] secret:hover:text-black"
                        aria-label={closeLabel}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="text-black dark:text-gray-300 secret:text-[#1cf85d]/80 font-medium text-base leading-relaxed secret:font-mono mb-6">
                    {children}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full bg-fuchsia-400 dark:bg-[#a855f7] secret:bg-[#1cf85d] text-black dark:text-white secret:text-black font-bold uppercase py-3 border-4 border-black dark:border-transparent secret:border-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-md cursor-pointer hover:-translate-y-0.5 secret:font-mono"
                >
                    {confirmLabel}
                </button>
            </div>
        </div>
    );
}
