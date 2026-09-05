import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type PageShellVariant = 'default' | 'fill' | 'auth';

const SHELL_CLASS: Record<PageShellVariant, string> = {
    default: 'w-full px-4 sm:px-6 lg:px-16 mx-auto mt-6 sm:mt-8 pb-12 relative z-20',
    fill: 'w-full px-4 sm:px-6 lg:px-16 mx-auto mt-6 sm:mt-8 pb-6 relative z-20 flex flex-col min-h-[calc(100dvh-6.5rem)]',
    auth: 'w-full px-4 sm:px-6 lg:px-16 mx-auto mt-8 sm:mt-16 pb-12 relative z-20 flex justify-center',
};

export function PageShell({
    children,
    className = '',
    variant = 'default',
}: {
    children: ReactNode;
    className?: string;
    variant?: PageShellVariant;
}) {
    return (
        <main className={`${SHELL_CLASS[variant]} ${className}`.trim()}>
            {children}
        </main>
    );
}

export function PageHeader({
    icon: Icon,
    children,
    extra,
}: {
    icon: LucideIcon;
    children: ReactNode;
    extra?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 sm:mb-8 bg-gradient-to-r from-cyan-400 to-fuchsia-500 dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-[4px_4px_0px_#000] dark:shadow-md secret:shadow-[0_0_15px_rgba(28,248,93,0.3)] secret:rounded-none">
            <div className="flex items-center space-x-3 min-w-0">
                <Icon className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)]" />
                <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase leading-tight">
                    {children}
                </h1>
            </div>
            {extra ? <div className="w-full md:w-auto min-w-0">{extra}</div> : null}
        </div>
    );
}

const AUTH_SHADOW = {
    cyan: 'shadow-[8px_8px_0px_#06b6d4] hover:shadow-[12px_12px_0px_#06b6d4]',
    fuchsia: 'shadow-[8px_8px_0px_#d946ef] hover:shadow-[12px_12px_0px_#d946ef]',
};

export function AuthCard({
    children,
    accent = 'cyan',
}: {
    children: ReactNode;
    accent?: 'cyan' | 'fuchsia';
}) {
    return (
        <div className={`w-full max-w-md border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-transparent ${AUTH_SHADOW[accent]} dark:shadow-[0_0_40px_rgba(168,85,247,0.25)] secret:shadow-[0_0_20px_rgba(28,248,93,0.1)] transition-all duration-300 rounded-sm secret:rounded-none hover:-translate-y-1 dark:hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] secret:hover:shadow-[0_0_30px_rgba(28,248,93,0.2)] flex flex-col overflow-hidden`}>
            {children}
        </div>
    );
}

export function AuthHeader({
    children,
    tone = 'fuchsia',
}: {
    children: ReactNode;
    tone?: 'cyan' | 'fuchsia';
}) {
    const background = tone === 'cyan' ? 'bg-cyan-400' : 'bg-fuchsia-400';
    return (
        <div className={`${background} dark:bg-gradient-to-r dark:from-[#1e1e1e] dark:to-[#3b0764] secret:bg-none secret:bg-black p-4 flex items-center justify-center border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] shadow-[4px_4px_0px_#000] dark:shadow-md z-10`}>
            <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white secret:text-[#1cf85d] dark:drop-shadow-md secret:drop-shadow-[0_0_5px_rgba(28,248,93,0.8)] secret:font-mono uppercase text-center">
                {children}
            </h1>
        </div>
    );
}
