import {
    addItem,
    groupByStore,
    itemKey,
    removeItem,
    setQuantity,
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
});
