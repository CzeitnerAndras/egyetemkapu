import { useEffect, useState } from 'react';
import { Layers, Plus, Trash2, Pencil, RotateCcw, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageHeader, PageShell } from '../components/PageLayout';
import { fetchWithAuth } from '../utils/authApi';

interface Deck {
    id: number;
    name: string;
    cardCount: number;
    dueCount: number;
}

interface Card {
    id: number;
    deckId: number;
    deckName: string;
    front: string;
    back: string;
    intervalDays: number;
}

const auth = { redirectOnAuthFailure: false, retryOn401: false };

export default function FlashcardsPage() {
    const { t } = useLanguage();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsLogin, setNeedsLogin] = useState(false);
    const [error, setError] = useState('');
    const [deckName, setDeckName] = useState('');
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [editingCardId, setEditingCardId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [queue, setQueue] = useState<Card[]>([]);
    const [flipped, setFlipped] = useState(false);
    const [rating, setRating] = useState(false);

    const selectedDeck = decks.find(deck => deck.id === selectedId) ?? null;
    const current = queue[0];
    const dueTotal = decks.reduce((sum, deck) => sum + deck.dueCount, 0);

    const readJson = async (res: Response, failureKey = 'cards.saveError') => {
        if (res.status === 401) {
            setNeedsLogin(true);
            return null;
        }
        if (!res.ok) {
            setError(t(failureKey));
            return null;
        }
        setNeedsLogin(false);
        setError('');
        return res.json();
    };

    const loadDecks = async () => {
        try {
            const res = await fetchWithAuth('/api/flashcards/decks', {}, auth);
            const data = await readJson(res, 'cards.loadError');
            if (Array.isArray(data)) {
                setDecks(data);
            }
        } catch {
            setError(t('cards.loadError'));
        } finally {
            setLoading(false);
        }
    };

    const loadCards = async (deckId: number) => {
        try {
            const res = await fetchWithAuth(`/api/flashcards/decks/${deckId}/cards`, {}, auth);
            const data = await readJson(res, 'cards.loadError');
            if (Array.isArray(data)) {
                setCards(data);
            }
        } catch {
            setError(t('cards.loadError'));
        }
    };

    useEffect(() => {
        const fetchDecks = async () => {
            try {
                const res = await fetchWithAuth('/api/flashcards/decks', {}, auth);
                if (res.status === 401) {
                    setNeedsLogin(true);
                    return;
                }
                if (!res.ok) {
                    setError(t('cards.loadError'));
                    return;
                }
                const data = await res.json();
                if (Array.isArray(data)) {
                    setDecks(data);
                }
            } catch {
                setError(t('cards.loadError'));
            } finally {
                setLoading(false);
            }
        };

        fetchDecks();
    }, [t]);

    const selectDeck = async (deckId: number) => {
        setSelectedId(deckId);
        setReviewing(false);
        setEditingCardId(null);
        setFront('');
        setBack('');
        await loadCards(deckId);
    };

    const createDeck = async (event: React.FormEvent) => {
        event.preventDefault();
        const name = deckName.trim();
        if (!name) return;
        setSaving(true);
        try {
            const res = await fetchWithAuth('/api/flashcards/decks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            }, auth);
            const created = await readJson(res);
            if (created?.id) {
                setDeckName('');
                await loadDecks();
                await selectDeck(created.id);
            }
        } catch {
            setError(t('cards.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const deleteDeck = async (deckId: number) => {
        if (!window.confirm(t('cards.confirmDeleteDeck'))) return;
        const res = await fetchWithAuth(`/api/flashcards/decks/${deckId}`, { method: 'DELETE' }, auth);
        if (res.status === 401) {
            setNeedsLogin(true);
            return;
        }
        if (!res.ok) {
            setError(t('cards.saveError'));
            return;
        }
        if (selectedId === deckId) {
            setSelectedId(null);
            setCards([]);
            setReviewing(false);
        }
        await loadDecks();
    };

    const saveCard = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedId) return;
        const question = front.trim();
        const answer = back.trim();
        if (!question || !answer) {
            setError(t('cards.emptySide'));
            return;
        }
        setSaving(true);
        try {
            const editing = editingCardId;
            const res = await fetchWithAuth(
                editing ? `/api/flashcards/cards/${editing}` : `/api/flashcards/decks/${selectedId}/cards`,
                {
                    method: editing ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ front: question, back: answer }),
                },
                auth
            );
            const saved = await readJson(res);
            if (saved) {
                setFront('');
                setBack('');
                setEditingCardId(null);
                await loadCards(selectedId);
                await loadDecks();
            }
        } catch {
            setError(t('cards.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const deleteCard = async (cardId: number) => {
        if (!window.confirm(t('cards.confirmDeleteCard'))) return;
        const res = await fetchWithAuth(`/api/flashcards/cards/${cardId}`, { method: 'DELETE' }, auth);
        if (!res.ok) {
            setError(res.status === 401 ? t('cards.needLogin') : t('cards.saveError'));
            return;
        }
        if (selectedId) {
            await loadCards(selectedId);
            await loadDecks();
        }
    };

    const startReview = async (deckId?: number) => {
        setError('');
        const url = deckId == null ? '/api/flashcards/due' : `/api/flashcards/due?deckId=${deckId}`;
        try {
            const res = await fetchWithAuth(url, {}, auth);
            const data = await readJson(res, 'cards.loadError');
            if (!Array.isArray(data)) return;
            setQueue(data);
            setFlipped(false);
            setReviewing(true);
        } catch {
            setError(t('cards.loadError'));
        }
    };

    const rateCard = async (nextRating: 'again' | 'good') => {
        if (!current || rating) return;
        setRating(true);
        try {
            const res = await fetchWithAuth(`/api/flashcards/cards/${current.id}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: nextRating }),
            }, auth);
            if (res.status === 401) {
                setNeedsLogin(true);
                return;
            }
            if (!res.ok) {
                setError(t('cards.reviewError'));
                return;
            }
            const next = nextRating === 'good' ? queue.slice(1) : [...queue.slice(1), current];
            setQueue(next);
            setFlipped(false);
            setError('');
            if (next.length === 0) {
                await loadDecks();
            }
        } catch {
            setError(t('cards.reviewError'));
        } finally {
            setRating(false);
        }
    };

    const leaveReview = () => {
        setReviewing(false);
        setQueue([]);
        setFlipped(false);
        loadDecks();
        if (selectedId) {
            loadCards(selectedId);
        }
    };

    return (
        <PageShell>
            <PageHeader icon={Layers}>{t('cards.title')}</PageHeader>

            {needsLogin ? (
                <p className="font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">{t('cards.needLogin')}</p>
            ) : loading ? (
                <p className="font-bold text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono uppercase">{t('cards.loading')}</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <section className="lg:col-span-1 bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#020617] dark:shadow-md secret:rounded-none flex flex-col">
                        <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2 mb-4 secret:font-mono uppercase">
                            {t('cards.decks')}
                        </h2>
                        <form onSubmit={createDeck} className="flex mb-4">
                            <label className="sr-only" htmlFor="deck-name">{t('cards.deckName')}</label>
                            <input
                                id="deck-name"
                                value={deckName}
                                onChange={event => setDeckName(event.target.value)}
                                placeholder={t('cards.deckPlaceholder')}
                                maxLength={80}
                                className="flex-1 border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] mr-2 p-2 outline-none bg-white dark:bg-transparent secret:bg-black dark:text-white secret:text-[#1cf85d] secret:font-mono font-bold shadow-[4px_4px_0px_#000] dark:shadow-none"
                            />
                            <button
                                type="submit"
                                disabled={saving}
                                aria-label={t('cards.addDeck')}
                                className="bg-blue-500 dark:bg-[#a855f7] secret:bg-transparent text-black dark:text-white secret:text-[#1cf85d] px-4 border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] cursor-pointer shadow-[4px_4px_0px_#000] dark:shadow-none disabled:opacity-50"
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        </form>

                        <div className="flex-1 space-y-2">
                            {decks.length === 0 ? (
                                error ? null : (
                                    <p className="font-bold text-gray-500 secret:text-[#1cf85d]/60 secret:font-mono uppercase">{t('cards.noDecks')}</p>
                                )
                            ) : decks.map(deck => (
                                <div key={deck.id} className="flex items-stretch gap-2">
                                    <button
                                        type="button"
                                        onClick={() => selectDeck(deck.id)}
                                        className={`flex-1 text-left p-3 border-4 font-bold cursor-pointer secret:font-mono ${selectedId === deck.id
                                            ? 'bg-blue-900 dark:bg-[#a855f7] text-white dark:text-white border-black secret:bg-[#1cf85d] secret:text-black secret:border-[#1cf85d]'
                                            : 'bg-white dark:bg-[#2a2a2a] text-black dark:text-white border-black dark:border-[#a855f7]/50 secret:bg-transparent secret:text-[#1cf85d] secret:border-[#1cf85d]'
                                            }`}
                                    >
                                        <span className="block">{deck.name}</span>
                                        <span className="block text-xs uppercase mt-1">{t('cards.due', { count: deck.dueCount })}</span>
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={t('cards.deleteDeck')}
                                        onClick={() => deleteDeck(deck.id)}
                                        className="px-3 border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] bg-white dark:bg-transparent secret:bg-transparent cursor-pointer"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => startReview()}
                            className="mt-4 py-3 font-bold border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-blue-500 dark:bg-[#a855f7] secret:bg-[#1cf85d] text-black dark:text-white secret:text-black cursor-pointer secret:font-mono uppercase shadow-[4px_4px_0px_#000] dark:shadow-none"
                        >
                            {t('cards.reviewAll', { count: dueTotal })}
                        </button>
                    </section>

                    <section className="lg:col-span-2 bg-slate-100 dark:bg-gradient-to-br dark:from-[#1e1e1e] dark:to-[#2b184a] secret:bg-none secret:bg-black border-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] p-6 shadow-[8px_8px_0px_#1e3a8a] dark:shadow-md secret:rounded-none">
                        {error && (
                            <p className="mb-4 font-bold text-red-600 dark:text-red-400 secret:text-[#1cf85d] secret:font-mono uppercase">{error}</p>
                        )}

                        {reviewing ? (
                            <div>
                                <div className="flex items-center justify-between border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2 mb-4">
                                    <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                                        {current ? current.deckName : t('cards.done')}
                                    </h2>
                                    <button type="button" onClick={leaveReview} className="font-bold underline cursor-pointer secret:font-mono uppercase">
                                        {t('cards.backToList')}
                                    </button>
                                </div>

                                {!current ? (
                                    <p className="font-bold text-black dark:text-gray-300 secret:text-[#1cf85d]/80 secret:font-mono">{t('cards.noneDue')}</p>
                                ) : (
                                    <div>
                                        <p className="text-sm font-bold uppercase mb-3 secret:font-mono">{t('cards.remaining', { count: queue.length })}</p>
                                        <div className="min-h-40 border-4 border-black dark:border-gray-700 secret:border-[#1cf85d] bg-white dark:bg-[#121212] secret:bg-black p-6 shadow-[4px_4px_0px_#000] dark:shadow-none mb-4">
                                            <p className="text-2xl font-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">{current.front}</p>
                                            {flipped && (
                                                <p className="mt-4 text-xl font-bold text-blue-950 dark:text-[#c084fc] secret:text-[#1cf85d] secret:font-mono">{current.back}</p>
                                            )}
                                        </div>
                                        {!flipped ? (
                                            <button
                                                type="button"
                                                onClick={() => setFlipped(true)}
                                                className="w-full py-3 font-bold border-4 border-black bg-blue-900 dark:bg-[#a855f7] dark:border-transparent dark:text-white secret:bg-[#1cf85d] secret:text-black secret:border-[#1cf85d] cursor-pointer secret:font-mono uppercase"
                                            >
                                                {t('cards.show')}
                                            </button>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    disabled={rating}
                                                    onClick={() => rateCard('again')}
                                                    className="py-3 font-bold border-4 border-black bg-white dark:bg-transparent dark:text-white secret:bg-transparent secret:text-[#1cf85d] secret:border-[#1cf85d] cursor-pointer flex items-center justify-center secret:font-mono uppercase disabled:opacity-50"
                                                >
                                                    <RotateCcw className="w-5 h-5 mr-2" /> {t('cards.again')}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={rating}
                                                    onClick={() => rateCard('good')}
                                                    className="py-3 font-bold border-4 border-black bg-blue-500 dark:bg-green-600 dark:text-white dark:border-transparent secret:bg-[#1cf85d] secret:text-black secret:border-[#1cf85d] cursor-pointer flex items-center justify-center secret:font-mono uppercase disabled:opacity-50"
                                                >
                                                    <Check className="w-5 h-5 mr-2" /> {t('cards.good')}
                                                </button>
                                            </div>
                                        )}
                                        <p className="mt-4 text-sm font-bold text-gray-700 dark:text-gray-300 secret:text-[#1cf85d]/70 secret:font-mono">{t('cards.schedule')}</p>
                                    </div>
                                )}
                            </div>
                        ) : !selectedDeck ? (
                            <p className="font-bold text-black dark:text-gray-300 secret:text-[#1cf85d]/80 secret:font-mono">{t('cards.pickDeck')}</p>
                        ) : (
                            <div>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black dark:border-gray-700 secret:border-[#1cf85d] pb-2 mb-4">
                                    <h2 className="text-xl font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">{selectedDeck.name}</h2>
                                    <button
                                        type="button"
                                        onClick={() => startReview(selectedDeck.id)}
                                        className="px-4 py-2 font-bold border-4 border-black bg-blue-500 dark:bg-[#a855f7] dark:text-white dark:border-[#a855f7] secret:bg-[#1cf85d] secret:text-black secret:border-[#1cf85d] cursor-pointer secret:font-mono uppercase"
                                    >
                                        {t('cards.reviewDue', { count: selectedDeck.dueCount })}
                                    </button>
                                </div>

                                {cards.length === 0 ? (
                                    <p className="mb-4 font-bold text-gray-500 secret:text-[#1cf85d]/60 secret:font-mono uppercase">{t('cards.noCards')}</p>
                                ) : (
                                    <ul className="space-y-3 mb-6">
                                        {cards.map(card => (
                                            <li key={card.id} className="border-4 border-black dark:border-[#a855f7]/50 secret:border-[#1cf85d] bg-white dark:bg-[#2a2a2a] secret:bg-transparent p-3 flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-bold text-black dark:text-white secret:text-[#1cf85d] secret:font-mono">{card.front}</p>
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 secret:text-[#1cf85d]/70 secret:font-mono">{card.back}</p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        aria-label={t('cards.edit')}
                                                        onClick={() => {
                                                            setEditingCardId(card.id);
                                                            setFront(card.front);
                                                            setBack(card.back);
                                                        }}
                                                        className="p-2 border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] cursor-pointer"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        aria-label={t('cards.delete')}
                                                        onClick={() => deleteCard(card.id)}
                                                        className="p-2 border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] cursor-pointer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <form onSubmit={saveCard} className="space-y-3">
                                    <div>
                                        <label htmlFor="card-front" className="block text-sm font-bold mb-1 secret:font-mono uppercase">{t('cards.front')}</label>
                                        <textarea
                                            id="card-front"
                                            required
                                            value={front}
                                            maxLength={1000}
                                            onChange={event => setFront(event.target.value)}
                                            placeholder={t('cards.frontPlaceholder')}
                                            rows={2}
                                            className="w-full border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] font-bold secret:font-mono outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="card-back" className="block text-sm font-bold mb-1 secret:font-mono uppercase">{t('cards.back')}</label>
                                        <textarea
                                            id="card-back"
                                            required
                                            value={back}
                                            maxLength={1000}
                                            onChange={event => setBack(event.target.value)}
                                            placeholder={t('cards.backPlaceholder')}
                                            rows={2}
                                            className="w-full border-4 border-black dark:border-gray-600 secret:border-[#1cf85d] p-2 bg-white dark:bg-[#121212] secret:bg-black text-black dark:text-white secret:text-[#1cf85d] font-bold secret:font-mono outline-none"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-4 py-3 font-bold border-4 border-black bg-blue-900 dark:bg-[#a855f7] dark:text-white dark:border-transparent secret:bg-[#1cf85d] secret:text-black secret:border-[#1cf85d] cursor-pointer secret:font-mono uppercase disabled:opacity-50"
                                        >
                                            {editingCardId ? t('cards.save') : t('cards.addCard')}
                                        </button>
                                        {editingCardId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingCardId(null);
                                                    setFront('');
                                                    setBack('');
                                                }}
                                                className="px-4 py-3 font-bold border-4 border-black bg-white dark:bg-transparent dark:text-white secret:bg-transparent secret:text-[#1cf85d] secret:border-[#1cf85d] cursor-pointer secret:font-mono uppercase"
                                            >
                                                {t('cards.cancel')}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </PageShell>
    );
}
