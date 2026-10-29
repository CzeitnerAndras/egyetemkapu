import {
    DEFAULT_STORE_ORDER,
    loadStoreOrder,
    reorderStores,
    saveStoreOrder,
    STORE_ORDER_KEY,
} from './storeOrder';

describe('storeOrder', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('az alap sorrendet adja, ha még nincs mentve', () => {
        expect(loadStoreOrder()).toEqual(DEFAULT_STORE_ORDER);
    });

    it('a mentett sorrendet olvassa, és a hiányzó boltot a végére teszi', () => {
        localStorage.setItem(STORE_ORDER_KEY, JSON.stringify(['lidl', 'coop', 'nem-bolt', 'lidl']));
        expect(loadStoreOrder()).toEqual(['lidl', 'coop', 'spar', 'penny', 'tesco', 'aldi', 'auchan', 'rossmann', 'dm', 'metro', 'real', 'cba']);
    });

    it('hibás mentés helyett az alap sorrendet adja', () => {
        localStorage.setItem(STORE_ORDER_KEY, '{not json');
        expect(loadStoreOrder()).toEqual(DEFAULT_STORE_ORDER);
        localStorage.setItem(STORE_ORDER_KEY, JSON.stringify({ store: 'aldi' }));
        expect(loadStoreOrder()).toEqual(DEFAULT_STORE_ORDER);
    });

    it('áthelyezi a boltot a cél helyére, és elmenti', () => {
        const next = reorderStores(DEFAULT_STORE_ORDER, 'aldi', 'spar');
        expect(next).toEqual(['aldi', 'spar', 'penny', 'tesco', 'auchan', 'coop', 'lidl', 'rossmann', 'dm', 'metro', 'real', 'cba']);
        expect(reorderStores(next, 'aldi', 'aldi')).toBe(next);
        saveStoreOrder(next);
        expect(loadStoreOrder()).toEqual(next);
    });
});
