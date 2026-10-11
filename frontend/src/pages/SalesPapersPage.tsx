import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, ExternalLink, ChevronLeft, ChevronRight, X, ShoppingCart, Plus, Minus, Trash2, Download } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageShell } from '../components/PageLayout';
import {
    addItem,
    formatShoppingListText,
    groupByStore,
    itemKey,
    loadShoppingList,
    removeItem,
    renameItem,
    saveShoppingList,
    setQuantity,
    type ShoppingListItem,
} from '../utils/shoppingList';

export type StoreId = 'aldi' | 'spar' | 'penny' | 'tesco' | 'auchan' | 'coop' | 'lidl';

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

const STORES: StoreId[] = ['spar', 'penny', 'tesco', 'aldi', 'auchan', 'coop', 'lidl'];

export default function SalesPapersPage() {
    const { t, locale } = useLanguage();
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

    {/* --- Load flyers --- */}
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

    {/* --- Save list --- */}
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

    {/* --- Search --- */}
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

    {/* --- Open flyer --- */}
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
        return `${formatDmy(from)} – ${formatDmy(to)}`;
    };

    const storeLabel = (store: StoreId) => store.toUpperCase();

    {/* --- Add to list --- */}
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
    const listItemCount = shoppingList.reduce((sum, item) => sum + item.quantity, 0);
    const currentFlyers = storeFlyers.filter((flyer) => isCurrentlyValidFlyer(flyer));
    const upcomingFlyers = storeFlyers.filter((flyer) => !isCurrentlyValidFlyer(flyer));

    const currentPageIndex = viewer
        ? viewer.flyer.pages.findIndex((page) => page.pageNumber === viewer.page)
        : -1;

    const pageSrc = viewer ? `/api/flyers/${viewer.flyer.id}/pages/${viewer.page}?full=1` : '';

    {/* --- Viewer lock --- */}
    useEffect(() => {
        if (!viewer) {
            return;
        }
        document.documentElement.classList.add('flyer-open');
        return () => document.documentElement.classList.remove('flyer-open');
    }, [viewer]);

    {/* --- Page prefetch --- */}
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

    const renderFlyerGroup = (label: string, items: FlyerSummary[], current: boolean) => {
        if (items.length === 0) return null;
        const period = periodLabel(items, locale);
        return (
            <>
                <h2 className="mb-4 text-lg font-bold text-[#1c1c1c] dark:text-white secret:text-[#1cf85d] xl:col-start-1">
                    {label}{period ? ` · ${period}` : ''}
                </h2>
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:col-start-1">
                    {items.map((flyer) => (
                        <button
                            key={flyer.id}
                            type="button"
                            onClick={() => openFlyer(flyer.id)}
                            className="relative flex w-full cursor-pointer gap-4 rounded-2xl border border-black/8 bg-white p-4 text-left text-[#1c1c1c] shadow-[0_8px_24px_rgba(16,24,16,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(16,24,16,0.1)] dark:border-white/10 dark:bg-[#1c1e1c] dark:text-white dark:hover:bg-[#3b0764] secret:border-[#1cf85d]/40 secret:bg-transparent secret:text-[#1cf85d] secret:hover:border-[#1cf85d]"
                        >
                            <FlyerCover flyerId={flyer.id} />
                            <span className={`absolute left-[6.6rem] top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                current
                                    ? 'bg-[#f6d86b] text-[#1c1c1c]'
                                    : 'bg-[#e7e9e4] text-[#3d433c] dark:bg-white/10 dark:text-white secret:bg-transparent secret:text-[#1cf85d] secret:border secret:border-[#1cf85d]'
                            }`}>
                                {current
                                    ? t('sales.validNow')
                                    : t('sales.startsOn', { date: flyer.validFrom ? shortDayMonth(flyer.validFrom, locale) : '' })}
                            </span>
                            <span className="min-w-0 pt-7">
                                <h3 className="text-base font-bold leading-tight">{flyer.title}</h3>
                                <p className="mt-1 text-sm text-[#5c6560] dark:text-white/70 secret:text-[#1cf85d]/80">
                                    {formatRange(flyer.validFrom, flyer.validTo)}
                                </p>
                                <p className="mt-1 text-sm text-[#5c6560] dark:text-white/70 secret:text-[#1cf85d]/80">
                                    {t('sales.paperMeta', { pages: flyer.pageCount, products: flyer.productCount })}
                                </p>
                                <span className="mt-3 inline-block text-sm font-semibold text-[#178a45] secret:text-[#1cf85d]">
                                    {current ? t('sales.openFlyer') : t('sales.previewFlyer')} →
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            </>
        );
    };

    return (
        <PageShell className="!mt-0 !px-0 !pb-0">
            <div className="min-h-[calc(100dvh-5rem)] bg-[#f3f5f2] px-4 py-8 text-[#1c1c1c] dark:bg-[#121412] dark:text-white secret:bg-transparent secret:text-[#1cf85d] sm:px-6 lg:px-16">
            {/* --- Header --- */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight">{t('sales.title')}</h1>
                <p className="mt-2 text-sm text-[#5c6560] dark:text-white/70 secret:text-[#1cf85d]/80">{t('sales.subtitle')}</p>
            </div>

            {error && (
                <p className="mb-6 font-semibold text-red-600 dark:text-red-300 secret:text-[#1cf85d]">{error}</p>
            )}

            {searching && (
                <p className="mb-6 text-sm font-semibold text-[#178a45] secret:text-[#1cf85d]">{t('sales.searching')}</p>
            )}

            {/* --- Store pills --- */}
            <div className="mb-8 flex flex-wrap items-center gap-2">
                {STORES.map((store) => (
                    <button
                        key={store}
                        type="button"
                        data-store={store}
                        aria-pressed={activeStore === store}
                        onClick={() => setActiveStore(store)}
                        className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold uppercase transition ${
                            activeStore === store
                                ? 'border-[#0f6e3a] bg-[#0f6e3a] text-white dark:border-[#1f8a4c] dark:bg-[#1f8a4c] secret:border-[#1cf85d] secret:bg-[#1cf85d] secret:text-black'
                                : 'border-black/10 bg-white text-[#1c1c1c] hover:border-black/25 dark:border-white/15 dark:bg-[#1c1e1c] dark:text-white secret:border-[#1cf85d] secret:bg-transparent secret:text-[#1cf85d]'
                        }`}
                    >
                        {storeLabel(store)}
                    </button>
                ))}
                <form onSubmit={handleSearch} className="w-full sm:ml-auto sm:w-72">
                    <label className="sr-only" htmlFor="flyer-search">{t('sales.searchLabel')}</label>
                    <div className="relative">
                        <button
                            type="submit"
                            className="absolute inset-y-0 left-0 flex cursor-pointer items-center px-3 text-[#6b726d]"
                            aria-label={t('sales.searchSubmit')}
                        >
                            <Search className="h-4 w-4" />
                        </button>
                        <input
                            id="flyer-search"
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('sales.searchPlaceholder')}
                            className="h-10 w-full rounded-full border border-black/10 bg-white py-0 pl-10 pr-3 text-sm text-[#1c1c1c] placeholder-[#8b928d] focus:outline-none focus:ring-2 focus:ring-[#178a45]/40 dark:border-white/10 dark:bg-[#1c1e1c] dark:text-white secret:border-[#1cf85d] secret:bg-black secret:text-[#1cf85d] secret:placeholder-[#1cf85d]/50"
                        />
                    </div>
                </form>
            </div>

            {/* --- Search results --- */}
            {hits && (
                <section className="mb-8 rounded-2xl border border-black/8 bg-white p-5 shadow-[0_8px_24px_rgba(16,24,16,0.06)] dark:border-white/10 dark:bg-[#1c1e1c] secret:border-[#1cf85d] secret:bg-transparent">
                    <h2 className="mb-4 text-lg font-bold">
                        {t('sales.resultsTitle', { count: hits.length })}
                    </h2>
                    {hits.length === 0 ? (
                        <p className="text-sm">{t('sales.noResults')}</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {hits.map((hit, index) => (
                                <div key={`${hit.flyerId}-${hit.kind}-${hit.pageNumber}-${index}`} className="rounded-xl border border-black/8 p-3 dark:border-white/10 secret:border-[#1cf85d]/40">
                                    <button
                                        type="button"
                                        onClick={() => openFlyer(hit.flyerId, hit.pageNumber)}
                                        className="w-full cursor-pointer text-left"
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <span className="rounded-full bg-[#e7f2e4] px-2 py-0.5 text-xs font-semibold text-[#0f6e3a] secret:bg-transparent secret:text-[#1cf85d]">
                                                {storeLabel(hit.store)} · {t('sales.page', { page: hit.pageNumber })}
                                            </span>
                                            <span className="text-[11px] font-semibold text-[#5c6560]">{hit.kind === 'product' ? t('sales.hitProduct') : t('sales.hitPage')}</span>
                                        </div>
                                        <h3 className="mb-1 font-bold leading-tight">
                                            {hit.productName || hit.title}
                                        </h3>
                                        {hit.kind === 'product' ? (
                                            <p className="text-sm text-[#5c6560] dark:text-white/70">{hit.title}</p>
                                        ) : hit.snippet ? (
                                            <p className="text-sm text-[#5c6560] dark:text-white/70">{hit.snippet}</p>
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
                                            className="mt-3 inline-flex cursor-pointer items-center gap-1 rounded-full bg-[#0f6e3a] px-3 py-1 text-xs font-semibold text-white secret:bg-[#1cf85d] secret:text-black"
                                        >
                                            <Plus className="h-3 w-3" />
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

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-8">
                {/* --- Flyers --- */}
                <div className="min-w-0 xl:contents">
                    {loading ? (
                        <p className="animate-pulse text-sm font-semibold">{t('sales.loading')}</p>
                    ) : storeFlyers.length === 0 ? (
                        <p className="text-sm">{t('sales.emptyStore')}</p>
                    ) : (
                        <>
                            {renderFlyerGroup(t('sales.validNow'), currentFlyers, true)}
                            {renderFlyerGroup(t('sales.nextWeek'), upcomingFlyers, false)}
                        </>
                    )}
                    <p className="mt-2 text-sm text-[#6b726d] dark:text-white/50 secret:text-[#1cf85d]/70 xl:col-start-1">
                        {t('sales.disclaimer')}
                    </p>
                </div>

                {/* --- Shopping list --- */}
                <section className={`h-fit w-full self-start rounded-2xl border border-black/8 bg-white p-4 text-[#1c1c1c] shadow-[0_8px_24px_rgba(16,24,16,0.06)] dark:border-white/10 dark:bg-[#1c1e1c] dark:text-white secret:border-[#1cf85d] secret:bg-transparent secret:text-[#1cf85d] xl:sticky xl:top-4 ${storeFlyers.length > 0 ? 'xl:col-start-2 xl:row-start-2' : ''}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            <h2 className="text-base font-bold">{t('sales.listTitle')}</h2>
                        </div>
                        {listItemCount > 0 && (
                            <span className="rounded-full bg-[#f6d86b] px-2 py-0.5 text-xs font-semibold text-[#1c1c1c]">
                                {t('sales.listCount', { count: listItemCount })}
                            </span>
                        )}
                    </div>
                    {shoppingList.length === 0 ? (
                        <p className="text-sm text-[#5c6560] dark:text-white/70">{t('sales.listEmpty')}</p>
                    ) : (
                        <>
                            <ul className="divide-y divide-black/8 dark:divide-white/10">
                                {listGroups.flatMap((group) => group.items).map((item) => (
                                    <li key={item.id} className="flex items-start gap-3 py-3 text-sm">
                                        <span aria-hidden className="mt-1 h-4 w-4 shrink-0 rounded border border-[#c5cbc6]" />
                                        <div className="min-w-0 flex-1">
                                            <ShoppingListName
                                                name={item.name}
                                                label={t('sales.listEditName')}
                                                onCommit={(name) => setShoppingList((prev) => renameItem(prev, item.id, name))}
                                            />
                                            <p className="text-xs text-[#6b726d] dark:text-white/60 secret:text-[#1cf85d]/70">
                                                <span>{storeLabel(item.store)}</span>
                                                <span> · {t('sales.page', { page: item.pageNumber })}</span>
                                            </p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShoppingList((prev) => setQuantity(prev, item.id, item.quantity - 1))}
                                                    className="cursor-pointer rounded border border-black/15 p-0.5 dark:border-white/20 secret:border-[#1cf85d]"
                                                    aria-label={t('sales.listDecrease')}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </button>
                                                <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setShoppingList((prev) => setQuantity(prev, item.id, item.quantity + 1))}
                                                    className="cursor-pointer rounded border border-black/15 p-0.5 dark:border-white/20 secret:border-[#1cf85d]"
                                                    aria-label={t('sales.listIncrease')}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShoppingList((prev) => removeItem(prev, item.id))}
                                            className="shrink-0 cursor-pointer text-[#6b726d]"
                                            aria-label={t('sales.listRemove')}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                onClick={() => downloadShoppingList(
                                    formatShoppingListText(shoppingList, (item) => t('sales.page', { page: item.pageNumber })),
                                    t('sales.listDownloadFile'),
                                )}
                                className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0f6e3a] py-3 text-sm font-semibold text-white secret:bg-[#1cf85d] secret:text-black"
                            >
                                <Download className="h-4 w-4" />
                                {t('sales.listDownload')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShoppingList([])}
                                className="mt-2 w-full cursor-pointer text-center text-xs font-semibold text-[#6b726d] secret:text-[#1cf85d]"
                            >
                                {t('sales.listClear')}
                            </button>
                        </>
                    )}
                </section>
            </div>
            </div>

            {/* --- Viewer --- */}
            {viewer && createPortal(
                <div className="fixed inset-0 bg-black/80 z-[80] flex items-stretch justify-center overflow-hidden overscroll-none p-2 sm:p-4">
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
                                    className="inline-flex items-center gap-1 font-bold uppercase text-sm border-4 border-black dark:border-[#166534] secret:border-[#1cf85d] px-3 py-1 text-black dark:text-white secret:text-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-black hover:bg-[#178a45] hover:text-white dark:hover:bg-[#166534] secret:hover:bg-[#1cf85d] secret:hover:text-black secret:hover:border-[#1cf85d]"
                                >
                                    <ExternalLink className="w-4 h-4" /> {t('sales.openOfficial')}
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setViewer(null)}
                                    className="p-2 bg-slate-100 dark:bg-[#121212] secret:bg-black border-4 border-black dark:border-[#166534] secret:border-[#1cf85d] text-black dark:text-[#4ade80] secret:text-[#1cf85d] cursor-pointer hover:bg-[#178a45] hover:text-white dark:hover:bg-[#166534] secret:hover:bg-[#1cf85d] secret:hover:text-black secret:hover:border-[#1cf85d]"
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
                            {/* --- Page products --- */}
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
                                                        className={`w-full text-left p-2 border-2 border-black dark:border-[#166534] secret:border-[#1cf85d] cursor-pointer ${
                                                            onList
                                                                ? 'bg-[#178a45] dark:bg-[#166534] secret:bg-[#1cf85d] text-white secret:text-black'
                                                                : 'bg-white dark:bg-[#121212] secret:bg-black hover:bg-[#0f6e3a] dark:hover:bg-[#14532d] secret:hover:bg-[#1cf85d] secret:hover:text-black hover:text-white'
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

                        {/* --- Pagination --- */}
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

{/* --- Date helpers --- */}
function localIsoDate(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDmy(iso?: string | null): string {
    if (!iso) return '?';
    const [year, month, day] = iso.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
}

function shortDayMonth(iso: string, locale: string): string {
    const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
    const month = date.toLocaleDateString(locale, { month: 'short' }).replace(/\.$/, '');
    return `${String(date.getDate()).padStart(2, '0')} ${month}`;
}

function periodLabel(items: FlyerSummary[], locale: string): string {
    const froms = items.map((item) => item.validFrom).filter((value): value is string => !!value).sort();
    const tos = items.map((item) => item.validTo).filter((value): value is string => !!value).sort();
    const start = froms[0];
    const end = tos[tos.length - 1];
    if (!start || !end) return '';
    const startDate = new Date(`${start.slice(0, 10)}T12:00:00`);
    const endDate = new Date(`${end.slice(0, 10)}T12:00:00`);
    if (startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth()) {
        const month = endDate.toLocaleDateString(locale, { month: 'short' }).replace(/\.$/, '');
        return `${String(startDate.getDate()).padStart(2, '0')}–${String(endDate.getDate()).padStart(2, '0')} ${month}`;
    }
    return `${shortDayMonth(start, locale)} – ${shortDayMonth(end, locale)}`;
}

function FlyerCover({ flyerId }: { flyerId: number }) {
    const [failed, setFailed] = useState(false);
    return (
        <span className="relative h-[5.75rem] w-[7.25rem] shrink-0">
            <span className="block h-full w-full overflow-hidden rounded-xl bg-white dark:bg-[#1c1e1c]">
                {failed ? null : (
                    <img
                        src={`/api/flyers/${flyerId}/pages/1`}
                        alt=""
                        role="presentation"
                        className="h-full w-full object-cover object-top"
                        onError={() => setFailed(true)}
                    />
                )}
            </span>
            <span className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#178a45] text-white shadow-md secret:bg-[#1cf85d] secret:text-black">
                <Plus className="h-4 w-4" />
            </span>
        </span>
    );
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

{/* --- Sort --- */}
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
    if (flyer.store === 'auchan') {
        if (hay.includes('hipermarket')) {
            return 0;
        }
        if (hay.includes('szupermarket')) {
            return 1;
        }
        return 2;
    }
    if (flyer.store === 'lidl') {
        if (hay.includes('nonfood')) {
            return 1;
        }
        if (hay.includes('regionalis')) {
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

{/* --- Download list --- */}
function downloadShoppingList(text: string, filename: string) {
    const blob = new Blob([`\uFEFF${text}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function ShoppingListName({
    name,
    label,
    onCommit,
}: {
    name: string;
    label: string;
    onCommit: (next: string) => void;
}) {
    const [draft, setDraft] = useState(name);

    useEffect(() => {
        setDraft(name);
    }, [name]);

    const commit = () => {
        const trimmed = draft.replace(/\s+/g, ' ').trim();
        if (!trimmed) {
            setDraft(name);
            return;
        }
        if (trimmed !== name) {
            onCommit(trimmed);
        } else if (draft !== trimmed) {
            setDraft(trimmed);
        }
    };

    return (
        <input
            value={draft}
            aria-label={label}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.currentTarget.blur();
                }
                if (event.key === 'Escape') {
                    setDraft(name);
                    event.currentTarget.blur();
                }
            }}
            className="w-full bg-transparent font-bold leading-tight text-black dark:text-white secret:text-[#1cf85d] border-2 border-transparent focus:border-black dark:focus:border-[#a855f7] secret:focus:border-[#1cf85d] px-0.5 -mx-0.5 outline-none"
        />
    );
}
