import { useEffect, useState } from 'react';

export const TOOL_TIMEOUT_MS = 5000;

export function toolIsDown(status: number): boolean {
    return status >= 500;
}

export function toolFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(TOOL_TIMEOUT_MS)
        : fallbackTimeout(TOOL_TIMEOUT_MS);
    return fetch(url, { ...init, signal });
}

function fallbackTimeout(ms: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
}

export function useToolHealth(url: string): boolean {
    const [down, setDown] = useState(false);

    useEffect(() => {
        let cancelled = false;
        toolFetch(url)
            .then((response) => {
                if (!cancelled) setDown(!response.ok);
            })
            .catch(() => {
                if (!cancelled) setDown(true);
            });
        return () => {
            cancelled = true;
        };
    }, [url]);

    return down;
}

export function ToolDownNotice({ message }: { message: string }) {
    return (
        <p
            role="alert"
            className="mb-6 border-4 border-black dark:border-red-500 secret:border-[#1cf85d] bg-blue-900 dark:bg-red-900/40 secret:bg-black text-white dark:text-red-300 secret:text-[#1cf85d] p-4 font-bold shadow-[4px_4px_0px_#000] secret:font-mono"
        >
            &gt; {message}
        </p>
    );
}
