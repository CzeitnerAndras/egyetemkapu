import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Newspaper, Search, ExternalLink, ChevronLeft, ChevronRight, X, ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { NoticeModal } from '../components/NoticeModal';
import { PageHeader, PageShell } from '../components/PageLayout';
import { useNotice } from '../components/useNotice';
import {
    addItem,
    groupByStore,
    itemKey,
    loadShoppingList,
    removeItem,
    saveShoppingList,
    setQuantity,
    type ShoppingListItem,
} from '../utils/shoppingList';

export type StoreId = 'aldi' | 'spar' | 'penny' | 'tesco';

interface FlyerSummary {
    id: number;
    store: StoreId;
    title: string;
    officialUrl: string;
    validFrom?: string | null;
    validTo?: string | null;
    pageCount: number;
    productCount: number;
}

interface SearchHit {
    flyerId: number;
    store: StoreId;
    title: string;
    pageNumber: number;
    productName?: string | null;
    snippet: string;
    kind: 'product' | 'page';
    productId?: number | null;
}

interface FlyerProduct {
    id: number;
    pageNumber: number;
    name: string;
}

interface FlyerDetail {
    id: number;
    store: StoreId;
    title: string;
    officialUrl: string;
    pages: { pageNumber: number; hasImage: boolean }[];
    products?: FlyerProduct[];
}

const STORES: StoreId[] = ['spar', 'penny', 'tesco', 'aldi'];

const PAPER_CARD =
    'text-left p-4 bg-white dark:bg-[#121212] secret:bg-transparent border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d] hover:bg-cyan-400 dark:hover:bg-[#3b0764] dark:hover:border-[#a855f7] secret:hover:bg-[#1cf85d] secret:hover:text-black transition-all cursor-pointer shadow-[2px_2px_0px_#000]';

export default function SalesPapersPage() {
    const { t, locale } = useLanguage();
    const notice = useNotice('sales-dev');
    const [activeStore, setActiveStore] = useState<StoreId>('spar');
    const [flyers, setFlyers] = useState<FlyerSummary[]>([]);
    const [query, setQuery] = useState('');
    const [hits, setHits] = useState<SearchHit[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState('');
    const [viewer, setViewer] = useState<{ flyer: FlyerDetail; page: number } | null>(null);
    const [pageStatus, setPageStatus] = useState<'loading' | 'ok' | 'error'>('loading');
    const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => loadShoppingList());

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch('/api/flyers', { cache: 'no-store' })
            .then((res) => {
                if (!res.ok) throw new Error('load');
                return res.json();
            })
            .then((data) => {
                if (!cancelled) {
                    setFlyers(Array.isArray(data) ? data : []);
                    setError('');
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setFlyers([]);
                    setError(t('sales.loadError'));
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [t]);

    useEffect(() => {
        saveShoppingList(shoppingList);
    }, [shoppingList]);

    const storeFlyers = useMemo(
        () => flyers
            .filter((flyer) => flyer.store === activeStore)
            .filter((flyer) => flyer.pageCount > 0)
            .filter((flyer) => isCurrentOrUpcomingFlyer(flyer))
            .sort(compareFlyers),
        [flyers, activeStore],
    );

    const handleSearch = async (event: React.FormEvent) => {
        event.preventDefault();
        const q = query.trim();
        if (!q) {
            setHits(null);
            return;
        }
        setSearching(true);
        try {
            const res = await fetch(`/api/flyers/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('search');
            const data = await res.json();
            setHits(Array.isArray(data) ? data : []);
            setError('');
        } catch {
            setHits([]);
            setError(t('sales.searchError'));
        } finally {
            setSearching(false);
        }
    };

    const openFlyer = async (flyerId: number, pageNumber = 1) => {
        try {
            const res = await fetch(`/api/flyers/${flyerId}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('detail');
            const flyer: FlyerDetail = await res.json();
            const first = flyer.pages[0]?.pageNumber ?? pageNumber;
            const page = flyer.pages.some((item) => item.pageNumber === pageNumber) ? pageNumber : first;
            setViewer({ flyer, page });
        } catch {
            setError(t('sales.viewerError'));
        }
    };

    const formatRange = (from?: string | null, to?: string | null) => {
        if (!from && !to) return t('sales.noDate');
        const start = from ? new Date(from).toLocaleDateString(locale) : '?';
        const end = to ? new Date(to).toLocaleDateString(locale) : '?';
        return `${start} – ${end}`;
    };

    const storeLabel = (store: StoreId) => store.toUpperCase();

    const addToList = (draft: {
        productId?: number | null;
        flyerId: number;
        store: StoreId;
        flyerTitle: string;
        pageNumber: number;
        name: string;
    }) => {
        setShoppingList((prev) => addItem(prev, draft));
    };

    const listedKey = (
        productId?: number | null,
        flyerId?: number,
        pageNumber?: number,
        name?: string | null,
    ) =>
        itemKey({
            productId,
            flyerId: flyerId ?? 0,
            pageNumber: pageNumber ?? 0,
            name: name ?? '',
        });

    const pageProducts = viewer
        ? (viewer.flyer.products ?? []).filter((product) => product.pageNumber === viewer.page)
        : [];
    const listGroups = groupByStore(shoppingList);

    const currentPageIndex = viewer
        ? viewer.flyer.pages.findIndex((page) => page.pageNumber === viewer.page)
        : -1;

    const pageSrc = viewer ? `/api/flyers/${viewer.flyer.id}/pages/${viewer.page}?full=1` : '';

    useEffect(() => {
        if (!viewer) {
            return;
        }
        document.documentElement.classList.add('flyer-open');
        return () => document.documentElement.classList.remove('flyer-open');
    }, [viewer]);

    useEffect(() => {
        if (!pageSrc || !viewer) {
            return;
        }
        let cancelled = false;
        setPageStatus('loading');
        const probe = new Image();
        const succeed = () => {
            if (!cancelled) setPageStatus('ok');
        };
        const fail = () => {
            if (!cancelled) setPageStatus('error');
        };
        probe.onload = succeed;
        probe.onerror = fail;
        probe.src = pageSrc;
        if (probe.complete) {
            if (probe.naturalWidth > 0) {
                succeed();
            } else {
                fail();
            }
        }
        const pages = viewer.flyer.pages;
        const index = pages.findIndex((page) => page.pageNumber === viewer.page);
        [index - 1, index + 1].forEach((nearby) => {
            if (nearby < 0 || nearby >= pages.length) {
                return;
            }
            const prefetch = new Image();
            prefetch.src = `/api/flyers/${viewer.flyer.id}/pages/${pages[nearby].pageNumber}?full=1`;
        });
        return () => {
            cancelled = true;
        };
    }, [pageSrc, viewer]);

    return (
        <PageShell>
            <PageHeader
                icon={Newspaper}
                extra={
                    <form onSubmit={handleSearch} className="flex w-full md:w-56 h-8 relative">
                        <label className="sr-only" htmlFor="flyer-search">{t('sales.searchLabel')}</label>
                        <input
                            id="flyer-search"
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('sales.searchPlaceholder')}
                            className="h-8 w-full bg-slate-100 dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-transparent secret:border-[#1cf85d] py-0 pl-2 pr-9 text-sm leading-none text-black dark:text-white secret:text-[#1cf85d] placeholder-gray-500 secret:placeholder-[#1cf85d]/50 focus:outline-none font-bold secret:font-mono"
                        />
                        <button
                            type="submit"
                            className="absolute inset-y-0 right-0 px-2 flex items-center text-fuchsia-600 dark:text-[#a855f7] secret:text-[#1cf85d] cursor-pointer"
                            aria-label={t('sales.searchSubmit')}
                        >
                            <Search className="w-4 h-4" />
                        </button>
                    </form>
                }
            >
                {t('sales.title')}
            </PageHeader>

            {error && (
                <p className="mb-6 font-bold text-red-600 dark:text-red-300 secret:text-[#1cf85d] secret:font-mono">{error}</p>
            )}

            {searching && (
                <p className="mb-6 font-bold uppercase secret:font-mono text-fuchsia-600 dark:text-[#c084fc]">{t('sales.searching')}</p>
            )}

            {hits && (
                <section className="mb-8 bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#000] dark:shadow-md">
                    <h2 className="text-xl font-bold uppercase secret:font-mono mb-4 text-black dark:text-white secret:text-[#1cf85d]">
                        {t('sales.resultsTitle', { count: hits.length })}
                    </h2>
                    {hits.length === 0 ? (
                        <p className="font-medium secret:font-mono">{t('sales.noResults')}</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {hits.map((hit, index) => (
                                <div key={`${hit.flyerId}-${hit.kind}-${hit.pageNumber}-${index}`} className={PAPER_CARD}>
                                    <button
                                        type="button"
                                        onClick={() => openFlyer(hit.flyerId, hit.pageNumber)}
                                        className="w-full text-left cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <span className="text-xs font-black uppercase px-2 py-1 border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-fuchsia-400 dark:bg-[#3b0764]">
                                                {storeLabel(hit.store)} · {t('sales.page', { page: hit.pageNumber })}
                                            </span>
                                            <span className="text-[11px] font-bold uppercase">{hit.kind === 'product' ? t('sales.hitProduct') : t('sales.hitPage')}</span>
                                        </div>
                                        <h3 className="font-bold uppercase leading-tight mb-1">
                                            {hit.productName || hit.title}
                                        </h3>
                                        {hit.kind === 'product' ? (
                                            <p className="text-sm opacity-80">{hit.title}</p>
                                        ) : hit.snippet ? (
                                            <p className="text-sm opacity-80">{hit.snippet}</p>
                                        ) : null}
                                    </button>
                                    {hit.kind === 'product' && hit.productName && (
                                        <button
                                            type="button"
                                            onClick={() => addToList({
                                                productId: hit.productId,
                                                flyerId: hit.flyerId,
                                                store: hit.store,
                                                flyerTitle: hit.title,
                                                pageNumber: hit.pageNumber,
                                                name: hit.productName ?? hit.title,
                                            })}
                                            className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] px-2 py-1 bg-cyan-400 dark:bg-[#a855f7] secret:bg-[#1cf85d] text-black secret:text-black cursor-pointer"
                                        >
                                            <Plus className="w-3 h-3" />
                                            {shoppingList.some((item) => item.id === listedKey(hit.productId, hit.flyerId, hit.pageNumber, hit.productName))
                                                ? t('sales.listAdded')
                                                : t('sales.listAdd')}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-1/4 flex flex-col space-y-2">
                    {STORES.map((store) => (
                        <button
                            key={store}
                            type="button"
                            data-store={store}
                            aria-pressed={activeStore === store}
                            onClick={() => setActiveStore(store)}
                            className={`p-4 font-bold text-left border-4 transition-all duration-300 shadow-[4px_4px_0px_#000] dark:shadow-sm secret:font-mono uppercase cursor-pointer
                                ${activeStore === store
                                    ? 'bg-cyan-400 dark:bg-[#a855f7] secret:bg-[#1cf85d] text-black dark:text-white secret:text-black border-black dark:border-transparent secret:border-[#1cf85d] translate-x-2'
                                    : 'bg-white dark:bg-[#121212] secret:bg-transparent text-black dark:text-gray-300 secret:text-[#1cf85d] border-black dark:border-[#a855f7] secret:border-[#1cf85d] hover:bg-fuchsia-400 dark:hover:bg-[#3b0764]'
                                }`}
                        >
                            <span className="block text-xl leading-none">{storeLabel(store)}</span>
                        </button>
                    ))}

                    <section className="mt-6 bg-slate-100 dark:bg-[#121212] secret:bg-transparent border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-4 shadow-[4px_4px_0px_#000] dark:shadow-sm text-black dark:text-white secret:text-[#1cf85d]">
                        <div className="flex items-center gap-2 mb-2">
                            <ShoppingCart className="w-4 h-4" />
                            <h2 className="text-sm font-black uppercase secret:font-mono">{t('sales.listTitle')}</h2>
                        </div>
                        <p className="text-xs font-medium mb-3 opacity-80">{t('sales.listHint')}</p>
                        {shoppingList.length === 0 ? (
                            <p className="text-sm font-bold">{t('sales.listEmpty')}</p>
                        ) : (
                            <>
                                {listGroups.map((group) => (
                                    <div key={group.store} className="mb-4">
                                        <div className="flex items-center justify-between gap-2 mb-2 border-b-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] pb-1">
                                            <p className="text-xs font-black uppercase">{storeLabel(group.store)}</p>
                                        </div>
                                        <ul className="space-y-2">
                                            {group.items.map((item) => (
                                                <li key={item.id} className="text-sm">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="font-bold leading-tight">{item.name}</p>
                                                            <p className="text-xs opacity-80">
                                                                {t('sales.page', { page: item.pageNumber })}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShoppingList((prev) => removeItem(prev, item.id))}
                                                            className="shrink-0 cursor-pointer"
                                                            aria-label={t('sales.listRemove')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShoppingList((prev) => setQuantity(prev, item.id, item.quantity - 1))}
                                                            className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-0.5 cursor-pointer"
                                                            aria-label={t('sales.listDecrease')}
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="font-black text-xs w-6 text-center">{item.quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShoppingList((prev) => setQuantity(prev, item.id, item.quantity + 1))}
                                                            className="border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-0.5 cursor-pointer"
                                                            aria-label={t('sales.listIncrease')}
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setShoppingList([])}
                                    className="mt-2 text-xs font-bold uppercase cursor-pointer"
                                >
                                    {t('sales.listClear')}
                                </button>
                            </>
                        )}
                    </section>
                </div>

                <div className="w-full lg:w-3/4">
                    <div className="bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#000] dark:shadow-md">
                        <div className="flex items-center mb-4 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2">
                            <Newspaper className="w-5 h-5 text-black dark:text-[#c084fc] secret:text-[#1cf85d]" />
                            <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase ml-2">
                                {storeLabel(activeStore)}
                            </h2>
                        </div>

                        {loading ? (
                            <p className="font-bold uppercase secret:font-mono animate-pulse">{t('sales.loading')}</p>
                        ) : storeFlyers.length === 0 ? (
                            <p className="font-medium secret:font-mono">{t('sales.emptyStore')}</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {storeFlyers.map((flyer) => (
                                    <button
                                        key={flyer.id}
                                        type="button"
                                        onClick={() => openFlyer(flyer.id)}
                                        className={PAPER_CARD}
                                    >
                                        <h3 className="text-lg font-bold uppercase leading-tight mb-2">{flyer.title}</h3>
                                        <p className="text-sm font-medium mb-3">{formatRange(flyer.validFrom, flyer.validTo)}</p>
                                        <p className="text-xs font-black uppercase">
                                            {t('sales.paperMeta', { pages: flyer.pageCount, products: flyer.productCount })}
                                        </p>
                                        <span className="mt-4 inline-block text-sm font-black uppercase">{t('sales.openPaper')} →</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <p className="mt-4 text-sm font-bold text-gray-600 dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono">
                        {t('sales.disclaimer')}
                    </p>
                </div>
            </div>

            <NoticeModal
                open={notice.open}
                onClose={notice.dismiss}
                title={t('sales.devTitle')}
                confirmLabel={t('notice.gotIt')}
                closeLabel={t('notice.close')}
            >
                {t('sales.devBody')}
            </NoticeModal>

            {viewer && createPortal(
                <div className="fixed inset-0 bg-black/80 z-[80] flex items-stretch justify-center p-2 sm:p-4">
                    <div className="bg-slate-100 dark:bg-[#1e1e1e] secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] w-full max-w-[1400px] h-full max-h-[98vh] overflow-hidden flex flex-col shadow-[8px_8px_0px_#000] dark:shadow-[0_0_40px_rgba(0,0,0,0.55)]">
                        <div className="flex items-center justify-between gap-3 p-4 border-b-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d]">
                            <div className="min-w-0 text-black dark:text-white secret:text-[#1cf85d]">
                                <p className="text-xs font-black uppercase">{storeLabel(viewer.flyer.store)}</p>
                                <h2 className="text-lg font-bold uppercase secret:font-mono leading-tight truncate">{viewer.flyer.title}</h2>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {shoppingList.length > 0 && (
                                    <span className="hidden sm:inline text-xs font-black uppercase text-black dark:text-white secret:text-[#1cf85d]">
                                        {t('sales.listCount', { count: shoppingList.reduce((sum, item) => sum + item.quantity, 0) })}
                                    </span>
                                )}
                                <a
                                    href={viewer.flyer.officialUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-bold uppercase text-sm border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] px-3 py-1 text-black dark:text-white secret:text-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-black hover:bg-cyan-400 dark:hover:bg-[#3b0764] secret:hover:bg-[#1cf85d] secret:hover:text-black"
                                >
                                    <ExternalLink className="w-4 h-4" /> {t('sales.openOfficial')}
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setViewer(null)}
                                    className="p-2 bg-slate-100 dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] text-black dark:text-[#a855f7] secret:text-[#1cf85d] cursor-pointer hover:bg-cyan-400 hover:text-black dark:hover:bg-[#3b0764]"
                                    aria-label={t('sales.closeViewer')}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
                            <div className="flex-1 overflow-auto bg-slate-200 dark:bg-[#121212] secret:bg-black p-3 min-h-0 relative">
                                {pageStatus !== 'ok' && (
                                    <p className="sticky top-1/3 font-bold uppercase secret:font-mono text-black dark:text-[#c084fc] secret:text-[#1cf85d] text-center px-4 z-10">
                                        {pageStatus === 'error' ? t('sales.pageLoadError') : t('sales.pageLoading')}
                                    </p>
                                )}
                                <img
                                    key={pageSrc}
                                    src={pageSrc}
                                    alt={t('sales.page', { page: viewer.page })}
                                    className={`block w-full h-auto border-4 border-black dark:border-[#a855f7]/40 secret:border-[#1cf85d] bg-white ${pageStatus === 'ok' ? '' : 'opacity-0'}`}
                                />
                            </div>
                            <aside className="lg:w-80 shrink-0 max-h-48 lg:max-h-none overflow-auto border-t-4 lg:border-t-0 lg:border-l-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-3 text-black dark:text-white secret:text-[#1cf85d] bg-slate-100 dark:bg-[#1e1e1e] secret:bg-black">
                                <h3 className="text-xs font-black uppercase">{t('sales.listPageProducts')}</h3>
                                <p className="text-[11px] font-medium opacity-80 mb-3">{t('sales.listPageHint')}</p>
                                {pageProducts.length === 0 ? (
                                    <p className="text-sm font-medium opacity-80">{t('sales.listNoPageProducts')}</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {pageProducts.map((product) => {
                                            const onList = shoppingList.some((item) =>
                                                item.id === listedKey(product.id, viewer.flyer.id, product.pageNumber, product.name));
                                            return (
                                                <li key={product.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => addToList({
                                                            productId: product.id,
                                                            flyerId: viewer.flyer.id,
                                                            store: viewer.flyer.store,
                                                            flyerTitle: viewer.flyer.title,
                                                            pageNumber: product.pageNumber,
                                                            name: product.name,
                                                        })}
                                                        aria-label={onList ? t('sales.listAdded') : t('sales.listAdd')}
                                                        className={`w-full text-left p-2 border-2 border-black dark:border-[#a855f7] secret:border-[#1cf85d] cursor-pointer ${
                                                            onList
                                                                ? 'bg-cyan-400 dark:bg-[#a855f7] secret:bg-[#1cf85d] text-black secret:text-black'
                                                                : 'bg-white dark:bg-[#121212] secret:bg-black hover:bg-fuchsia-400 dark:hover:bg-[#3b0764]'
                                                        }`}
                                                    >
                                                        <p className="font-bold leading-tight">{product.name}</p>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </aside>
                        </div>

                        <div className="flex items-center justify-between p-4 border-t-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] text-black dark:text-white secret:text-[#1cf85d]">
                            <button
                                type="button"
                                disabled={currentPageIndex <= 0}
                                onClick={() => setViewer((prev) => prev && currentPageIndex > 0
                                    ? { ...prev, page: prev.flyer.pages[currentPageIndex - 1].pageNumber }
                                    : prev)}
                                className="inline-flex items-center gap-1 font-bold uppercase disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronLeft className="w-5 h-5" /> {t('sales.prevPage')}
                            </button>
                            <span className="font-black uppercase secret:font-mono">
                                {t('sales.pageOf', { page: viewer.page, total: viewer.flyer.pages.length })}
                            </span>
                            <button
                                type="button"
                                disabled={currentPageIndex < 0 || currentPageIndex >= viewer.flyer.pages.length - 1}
                                onClick={() => setViewer((prev) => prev && currentPageIndex >= 0 && currentPageIndex < prev.flyer.pages.length - 1
                                    ? { ...prev, page: prev.flyer.pages[currentPageIndex + 1].pageNumber }
                                    : prev)}
                                className="inline-flex items-center gap-1 font-bold uppercase disabled:opacity-40 cursor-pointer"
                            >
                                {t('sales.nextPage')} <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </PageShell>
    );
}

function localIsoDate(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addIsoDays(iso: string, days: number): string {
    const date = new Date(`${iso}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localIsoDate(date);
}

function isCurrentlyValidFlyer(flyer: FlyerSummary, today = localIsoDate()): boolean {
    if (flyer.validFrom && flyer.validFrom > today) {
        return false;
    }
    if (flyer.validTo && flyer.validTo < today) {
        return false;
    }
    return true;
}

export function isCurrentOrUpcomingFlyer(flyer: FlyerSummary, today = localIsoDate()): boolean {
    if (flyer.validTo && flyer.validTo < today) {
        return false;
    }
    return !flyer.validFrom || flyer.validFrom <= addIsoDays(today, 8);
}

function flyerKind(flyer: FlyerSummary): number {
    const hay = `${flyer.officialUrl ?? ''} ${flyer.title ?? ''}`.toLowerCase();
    if (flyer.store === 'aldi') {
        if (hay.includes('online')) {
            return 0;
        }
        if (hay.includes('kozepso') || hay.includes('középső')) {
            return 1;
        }
        return 2;
    }
    if (flyer.store === 'spar') {
        if (hay.includes('/interspar/') || hay.includes('interspar')) {
            return 1;
        }
        if (hay.includes('/spar-market/') || hay.includes('market')) {
            return 2;
        }
        return 0;
    }
    if (flyer.store === 'tesco') {
        if (hay.includes('/szupermarket/') || hay.includes('szupermarket')) {
            return 1;
        }
        if (hay.includes('/katalogusok/katalogus/') || hay.includes('katalógus')) {
            return 2;
        }
        return 0;
    }
    return 0;
}

function compareFlyers(a: FlyerSummary, b: FlyerSummary, today = localIsoDate()): number {
    const aNow = isCurrentlyValidFlyer(a, today);
    const bNow = isCurrentlyValidFlyer(b, today);
    if (aNow !== bNow) {
        return aNow ? -1 : 1;
    }
    const kind = flyerKind(a) - flyerKind(b);
    if (kind !== 0) {
        return kind;
    }
    const from = (b.validFrom ?? '').localeCompare(a.validFrom ?? '');
    if (from !== 0) {
        return from;
    }
    return a.title.localeCompare(b.title, 'hu');
}
