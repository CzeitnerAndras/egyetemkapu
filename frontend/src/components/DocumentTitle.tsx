import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const SITE = 'Egyetemkapu';
const ORIGIN = 'https://egyetemkapu.hu';

const ROUTE_TITLES: Record<string, string> = {
    '/': 'seo.defaultTitle',
    '/login': 'login.title',
    '/register': 'register.title',
    '/elfelejtett-jelszo': 'forgot.title',
    '/uj-jelszo': 'reset.title',
    '/reset-password': 'reset.title',
    '/ai': 'ai.title',
    '/naptar': 'nav.calendar',
    '/profile': 'profile.title',
    '/kalkulator': 'nav.calculators',
    '/tudastar': 'kb.title',
    '/hivatkozas': 'ref.title',
    '/tanuloszoba': 'focus.title',
    '/otletlada': 'idea.title',
    '/admin': 'admin.title',
    '/about': 'about.title',
    '/faq': 'faq.title',
    '/settings': 'settings.title',
    '/linktar': 'links.title',
    '/akcios-ujsag': 'sales.title',
};

const NOINDEX_PATHS = new Set([
    '/admin',
    '/S3CR3T',
    '/profile',
    '/settings',
    '/uj-jelszo',
    '/reset-password',
    '/elfelejtett-jelszo',
]);

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
    let el = document.head.querySelector(selector);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

export default function DocumentTitle() {
    const { pathname } = useLocation();
    const { t, language } = useLanguage();

    useEffect(() => {
        const titleKey = ROUTE_TITLES[pathname];
        const title = titleKey && pathname !== '/' ? `${t(titleKey)} | ${SITE}` : t('seo.defaultTitle');
        const description = t('seo.description');
        const canonicalHref = `${ORIGIN}${pathname === '/' ? '/' : pathname}`;
        const robots = NOINDEX_PATHS.has(pathname) ? 'noindex, nofollow' : 'index, follow';

        document.title = title;

        setMeta('meta[name="description"]', 'name', 'description', description);
        setMeta('meta[name="robots"]', 'name', 'robots', robots);
        setMeta('meta[property="og:title"]', 'property', 'og:title', title);
        setMeta('meta[property="og:description"]', 'property', 'og:description', description);
        setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalHref);
        setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
        setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

        let canonical = document.head.querySelector('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.setAttribute('rel', 'canonical');
            document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', canonicalHref);
    }, [pathname, t, language]);

    return null;
}
