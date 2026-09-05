import { render, screen } from '@testing-library/react';
import { Info } from 'lucide-react';
import { AuthCard, AuthHeader, PageHeader, PageShell } from './PageLayout';

describe('PageLayout Komponensek', () => {
    it('az alap PageShell a közös oldalszélességet használja', () => {
        render(<PageShell>tartalom</PageShell>);

        const main = screen.getByRole('main');
        expect(main).toHaveTextContent('tartalom');
        expect(main).toHaveClass('w-full', 'px-4', 'sm:px-6', 'lg:px-16');
        expect(main).not.toHaveClass('justify-center');
    });

    it('a fill variáns kitölti a képernyő magasságát', () => {
        render(<PageShell variant="fill">chat</PageShell>);

        expect(screen.getByRole('main').className).toContain('min-h-[calc(100dvh-6.5rem)]');
    });

    it('az auth variáns középre igazítja a kártyát', () => {
        render(<PageShell variant="auth">űrlap</PageShell>);

        expect(screen.getByRole('main')).toHaveClass('flex', 'justify-center');
    });

    it('további className-et hozzáfűz a kerethez', () => {
        render(<PageShell className="space-y-8">extra</PageShell>);

        expect(screen.getByRole('main')).toHaveClass('space-y-8', 'px-4');
    });

    it('a PageHeader ikont, címet és opcionális extra tartalmat jelenít meg', () => {
        render(
            <PageHeader icon={Info} extra={<button type="button">Több</button>}>
                about.title
            </PageHeader>
        );

        expect(screen.getByRole('heading', { level: 1, name: 'about.title' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Több' })).toBeInTheDocument();
    });

    it('az AuthCard max-w-md szélességű neo-brutalista kártya', () => {
        render(
            <AuthCard>
                <p>bejelentkezés</p>
            </AuthCard>
        );

        expect(screen.getByText('bejelentkezés').parentElement).toHaveClass('max-w-md', 'border-4');
    });

    it('az AuthHeader címsorként rendereli a szöveget', () => {
        render(<AuthHeader>login.title</AuthHeader>);

        expect(screen.getByRole('heading', { level: 1, name: 'login.title' })).toBeInTheDocument();
    });
});
