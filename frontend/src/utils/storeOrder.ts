export type OrderedStoreId = 'aldi' | 'spar' | 'penny' | 'tesco' | 'auchan' | 'coop' | 'lidl' | 'rossmann' | 'dm' | 'metro' | 'real' | 'cba';

export const STORE_ORDER_KEY = 'egyetemkapu.storeOrder';

export const DEFAULT_STORE_ORDER: OrderedStoreId[] = ['spar', 'penny', 'tesco', 'aldi', 'auchan', 'coop', 'lidl', 'rossmann', 'dm', 'metro', 'real', 'cba'];

export function storeLabel(store: OrderedStoreId): string {
    return store === 'real' ? 'REÁL' : store.toUpperCase();
}

const KNOWN = new Set<string>(DEFAULT_STORE_ORDER);

function isStore(value: unknown): value is OrderedStoreId {
    return typeof value === 'string' && KNOWN.has(value);
}

export function loadStoreOrder(): OrderedStoreId[] {
    try {
        const raw = localStorage.getItem(STORE_ORDER_KEY);
        if (!raw) {
            return [...DEFAULT_STORE_ORDER];
        }
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [...DEFAULT_STORE_ORDER];
        }
        const picked: OrderedStoreId[] = [];
        for (const value of parsed) {
            if (isStore(value) && !picked.includes(value)) {
                picked.push(value);
            }
        }
        const missing = DEFAULT_STORE_ORDER.filter((store) => !picked.includes(store));
        return [...picked, ...missing];
    } catch {
        return [...DEFAULT_STORE_ORDER];
    }
}

export function saveStoreOrder(order: OrderedStoreId[]): void {
    localStorage.setItem(STORE_ORDER_KEY, JSON.stringify(order));
}

export function reorderStores(order: OrderedStoreId[], from: OrderedStoreId, to: OrderedStoreId): OrderedStoreId[] {
    const fromIndex = order.indexOf(from);
    const toIndex = order.indexOf(to);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return order;
    }
    const next = [...order];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, from);
    return next;
}
