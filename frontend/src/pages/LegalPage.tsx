import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { PageHeader, PageShell } from '../components/PageLayout';

export type LegalKind = 'privacy' | 'imprint' | 'terms';

const SECTIONS: Record<LegalKind, string[]> = {
    privacy: ['who', 'account', 'cookies', 'browser', 'content', 'uploads', 'idea', 'outside', 'flyers', 'keep', 'rights'],
    imprint: ['operator', 'contact', 'host', 'shop'],
    terms: ['use', 'account', 'uploads', 'tools', 'flyers', 'changes'],
};

const PAGE_LINKS: Record<string, string> = {
    idea: '/otletlada',
    profile: '/profile',
    privacy: '/adatvedelem',
};

const linkClass = 'font-black text-blue-950 underline dark:text-[#c084fc] secret:text-[#1cf85d]';

function renderLegalText(text: string) {
    const parts = text.split(/(\[\[[a-z]+:[^\]]+\]\])/);
    if (parts.length === 1) return text;
    return parts.map((part, index) => {
        const match = /^\[\[([a-z]+):([^\]]+)\]\]$/.exec(part);
        if (!match) return part;
        const to = PAGE_LINKS[match[1]];
        if (!to) return match[2];
        return (
            <Link key={index} to={to} className={linkClass}>
                {match[2]}
            </Link>
        );
    });
}

export default function LegalPage({ kind }: { kind: LegalKind }) {
    const { t } = useLanguage();

    return (
        <PageShell>
            <PageHeader icon={Scale}>{t(`legal.${kind}.title`)}</PageHeader>
            <p className="mb-8 text-sm font-bold text-black dark:text-gray-400 secret:text-[#1cf85d]/70 secret:font-mono">
                {t('legal.updated')}
            </p>
            <div className="max-w-3xl space-y-8">
                {SECTIONS[kind].map((section) => (
                    <section key={section}>
                        <h2 className="mb-2 text-xl font-black text-black dark:text-white secret:text-[#1cf85d] secret:font-mono uppercase">
                            {t(`legal.${kind}.${section}.title`)}
                        </h2>
                        <p className="text-base font-medium leading-relaxed text-black dark:text-gray-300 secret:text-[#1cf85d]/80 secret:font-mono">
                            {renderLegalText(t(`legal.${kind}.${section}.body`))}
                        </p>
                    </section>
                ))}
            </div>
        </PageShell>
    );
}
