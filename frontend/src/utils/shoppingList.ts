export const SHOPPING_LIST_KEY = 'egyetemkapu.shoppingList';

export type ShoppingStoreId = 'aldi' | 'spar' | 'penny' | 'tesco';

export interface ShoppingListItem {
    id: string;
    productId?: number | null;
    flyerId: number;
    store: ShoppingStoreId;
    flyerTitle: string;
    pageNumber: number;
    name: string;
    quantity: number;
}

export type ShoppingListDraft = Omit<ShoppingListItem, 'id' | 'quantity'> & { quantity?: number };

const STORE_ORDER: ShoppingStoreId[] = ['spar', 'penny', 'tesco', 'aldi'];

export function itemKey(item: Pick<ShoppingListItem, 'productId' | 'flyerId' | 'pageNumber' | 'name'>): string {
    if (item.productId != null) {
        return `p:${item.productId}`;
    }
    return `f:${item.flyerId}:${item.pageNumber}:${item.name}`;
}

export function addItem(list: ShoppingListItem[], draft: ShoppingListDraft): ShoppingListItem[] {
    const id = itemKey(draft);
    const extra = draft.quantity ?? 1;
    const existing = list.find((item) => item.id === id);
    if (existing) {
        return list.map((item) => (item.id === id ? { ...item, quantity: item.quantity + extra } : item));
    }
    return [...list, { ...draft, id, quantity: extra }];
}

export function setQuantity(list: ShoppingListItem[], id: string, quantity: number): ShoppingListItem[] {
    if (quantity < 1) {
        return list.filter((item) => item.id !== id);
    }
    return list.map((item) => (item.id === id ? { ...item, quantity } : item));
}

export function removeItem(list: ShoppingListItem[], id: string): ShoppingListItem[] {
    return list.filter((item) => item.id !== id);
}

export function groupByStore(list: ShoppingListItem[]): { store: ShoppingStoreId; items: ShoppingListItem[] }[] {
    return STORE_ORDER
        .map((store) => ({ store, items: list.filter((item) => item.store === store) }))
        .filter((group) => group.items.length > 0);
}

export function loadShoppingList(): ShoppingListItem[] {
    try {
        const raw = localStorage.getItem(SHOPPING_LIST_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(isShoppingListItem).map(normalizeItem);
    } catch {
        return [];
    }
}

export function saveShoppingList(list: ShoppingListItem[]): void {
    localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(list));
}

function normalizeItem(item: ShoppingListItem): ShoppingListItem {
    return {
        id: itemKey(item),
        productId: item.productId,
        flyerId: item.flyerId,
        store: item.store,
        flyerTitle: item.flyerTitle,
        pageNumber: item.pageNumber,
        name: item.name,
        quantity: item.quantity,
    };
}

function isShoppingListItem(value: unknown): value is ShoppingListItem {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const item = value as ShoppingListItem;
    return typeof item.id === 'string'
        && typeof item.flyerId === 'number'
        && typeof item.store === 'string'
        && typeof item.name === 'string'
        && typeof item.quantity === 'number';
}
