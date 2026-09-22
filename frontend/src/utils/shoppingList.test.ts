import {
    addItem,
    groupByStore,
    itemKey,
    loadShoppingList,
    removeItem,
    renameItem,
    saveShoppingList,
    setQuantity,
    SHOPPING_LIST_KEY,
    type ShoppingListItem,
} from './shoppingList';

function item(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
    return {
        id: 'p:11',
        productId: 11,
        flyerId: 1,
        store: 'aldi',
        flyerTitle: 'ALDI heti újság',
        pageNumber: 2,
        name: 'Kakaóscsiga',
        quantity: 1,
        ...overrides,
    };
}

describe('shoppingList', () => {
    it('ugyanazt a terméket darabszámmal adja hozzá', () => {
        const once = addItem([], {
            productId: 11,
            flyerId: 1,
            store: 'aldi',
            flyerTitle: 'ALDI heti újság',
            pageNumber: 2,
            name: 'Kakaóscsiga',
        });
        const twice = addItem(once, {
            productId: 11,
            flyerId: 1,
            store: 'aldi',
            flyerTitle: 'ALDI heti újság',
            pageNumber: 2,
            name: 'Kakaóscsiga',
        });
        expect(itemKey(once[0])).toBe('p:11');
        expect(twice).toHaveLength(1);
        expect(twice[0].quantity).toBe(2);
    });

    it('boltonként csoportosít, és nullázáskor kiveszi a tételt', () => {
        const list = [
            item(),
            item({ id: 'p:22', productId: 22, store: 'tesco', name: 'Tej', flyerTitle: 'Tesco Hipermarket' }),
        ];
        const grouped = groupByStore(list);
        expect(grouped.map((group) => group.store)).toEqual(['tesco', 'aldi']);
        expect(removeItem(list, 'p:11')).toHaveLength(1);
        expect(setQuantity(list, 'p:11', 0)).toHaveLength(1);
    });

    it('átírja a hibás nevet, de a tétel azonosítóját megtartja', () => {
        const renamed = renameItem([item()], 'p:11', '  Kakaós csiga  ');
        expect(renamed).toHaveLength(1);
        expect(renamed[0].id).toBe('p:11');
        expect(renamed[0].name).toBe('Kakaós csiga');
        expect(renameItem([item()], 'p:11', '   ')).toEqual([item()]);
    });

    it('productId nélkül a flyer+oldal+név kulcsot használja, és Auchan a lista végére kerül', () => {
        const nameless = addItem([], {
            productId: null,
            flyerId: 9,
            store: 'auchan',
            flyerTitle: 'Auchan Hipermarket',
            pageNumber: 4,
            name: 'Kenyér',
        });
        expect(itemKey(nameless[0])).toBe('f:9:4:Kenyér');
        expect(setQuantity(nameless, nameless[0].id, 3)[0].quantity).toBe(3);

        const grouped = groupByStore([
            item({ store: 'auchan' }),
            item({ id: 'p:22', productId: 22, store: 'tesco', name: 'Tej' }),
        ]);
        expect(grouped.map((group) => group.store)).toEqual(['tesco', 'auchan']);
    });

    it('mentés után visszatölti a listát, hibás JSON-nál üreset ad', () => {
        localStorage.clear();
        expect(loadShoppingList()).toEqual([]);

        const list = [item()];
        saveShoppingList(list);
        expect(loadShoppingList()).toEqual(list);

        localStorage.setItem(SHOPPING_LIST_KEY, '{not json');
        expect(loadShoppingList()).toEqual([]);

        localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify([{ name: 'invalid' }]));
        expect(loadShoppingList()).toEqual([]);
    });
});
