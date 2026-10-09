import type { ReactNode } from 'react';

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

function linkify(text: string, linkClassName: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    const pattern = new RegExp(URL_PATTERN.source, 'gi');
    let last = 0;
    for (const match of text.matchAll(pattern)) {
        const start = match.index ?? 0;
        if (start > last) {
            nodes.push(text.slice(last, start));
        }
        let url = match[0];
        let trailing = '';
        while (/[.,;:!?)\]]$/.test(url)) {
            trailing = url.slice(-1) + trailing;
            url = url.slice(0, -1);
        }
        if (url) {
            nodes.push(
                <a
                    key={start}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClassName}
                    onClick={(event) => event.stopPropagation()}
                >
                    {url}
                </a>
            );
        }
        if (trailing) {
            nodes.push(trailing);
        }
        last = start + match[0].length;
    }
    if (last < text.length) {
        nodes.push(text.slice(last));
    }
    return nodes;
}

export default function LinkifiedText({ text, linkClassName }: { text: string; linkClassName: string }) {
    return <>{linkify(text || '', linkClassName)}</>;
}
