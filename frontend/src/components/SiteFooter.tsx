import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { isFlyerHost } from '../utils/flyerSite';

const LINKS = [
    { href: '/adatvedelem', key: 'footer.privacy' },
    { href: '/impresszum', key: 'footer.imprint' },
    { href: '/felhasznalasi-feltetelek', key: 'footer.terms' },
] as const;

const linkClass = 'font-bold underline text-black dark:text-gray-200 secret:text-[#1cf85d] hover:text-blue-900 dark:hover:text-[#c084fc]';

export default function SiteFooter() {
    const { t } = useLanguage();
    const onFlyerHost = isFlyerHost();

    return (
        <footer className="relative z-20 mt-auto border-t-4 border-black dark:border-[#a855f7] secret:border-[#1cf85d] bg-white/80 dark:bg-[#121212] secret:bg-black px-4 py-6 sm:px-6 lg:px-16">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-black dark:text-gray-300 secret:text-[#1cf85d] secret:font-mono">
                    {t('footer.note')}
                </p>
                <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label={t('footer.nav')}>
                    {LINKS.map((item) => onFlyerHost ? (
                        <a key={item.href} href={`https://egyetemkapu.hu${item.href}`} className={linkClass}>
                            {t(item.key)}
                        </a>
                    ) : (
                        <Link key={item.href} to={item.href} className={linkClass}>
                            {t(item.key)}
                        </Link>
                    ))}
                </nav>
            </div>
        </footer>
    );
}
