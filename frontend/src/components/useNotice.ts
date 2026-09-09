import { useState } from 'react';

const PREFIX = 'notice:';

function readOpen(id?: string) {
    if (!id) return true;
    try {
        return sessionStorage.getItem(PREFIX + id) !== 'dismissed';
    } catch {
        return true;
    }
}

export function useNotice(id?: string) {
    const [open, setOpen] = useState(() => readOpen(id));

    const dismiss = () => {
        if (id) {
            try {
                sessionStorage.setItem(PREFIX + id, 'dismissed');
            } catch {
                
            }
        }
        setOpen(false);
    };

    return { open, dismiss };
}
