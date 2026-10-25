import { cleanup, render, screen } from '@testing-library/react';
import App from './App';
import { isFlyerHost, isStudentProductionHost } from './utils/flyerSite';

jest.mock('./utils/flyerSite', () => ({
    FLYER_ORIGIN: 'https://akcio.egyetemkapu.hu',
    isFlyerHost: jest.fn(() => false),
    isStudentProductionHost: jest.fn(() => false),
}));

jest.mock('./i18n/LanguageContext', () => ({
    LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./components/Navbar', () => ({
    __esModule: true,
    default: () => <nav>navbar</nav>,
}));

jest.mock('./components/DocumentTitle', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('./components/PresenceHeartbeat', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('./pages/HomePage', () => ({ __esModule: true, default: () => <div>home-page</div> }));
jest.mock('./pages/LoginPage', () => ({ __esModule: true, default: () => <div>login-page</div> }));
jest.mock('./pages/RegistrationPage', () => ({ __esModule: true, default: () => <div>register-page</div> }));
jest.mock('./pages/ForgotPasswordPage', () => ({ __esModule: true, default: () => <div>forgot-page</div> }));
jest.mock('./pages/ResetPasswordPage', () => ({ __esModule: true, default: () => <div>reset-page</div> }));
jest.mock('./pages/VerifyEmailPage', () => ({ __esModule: true, default: () => <div>verify-page</div> }));
jest.mock('./pages/SecretPage', () => ({ __esModule: true, default: () => <div>secret-page</div> }));
jest.mock('./pages/AIAssistantPage', () => ({ __esModule: true, default: () => <div>ai-page</div> }));
jest.mock('./pages/CalendarPage', () => ({ __esModule: true, default: () => <div>calendar-page</div> }));
jest.mock('./pages/ProfilePage', () => ({ __esModule: true, default: () => <div>profile-page</div> }));
jest.mock('./pages/CalculatorPage', () => ({ __esModule: true, default: () => <div>calculator-page</div> }));
jest.mock('./pages/PointsPage', () => ({ __esModule: true, default: () => <div>points-page</div> }));
jest.mock('./pages/KnowledgeBasePage', () => ({ __esModule: true, default: () => <div>knowledge-page</div> }));
jest.mock('./pages/ReferencePage', () => ({ __esModule: true, default: () => <div>reference-page</div> }));
jest.mock('./pages/FocusRoomPage', () => ({ __esModule: true, default: () => <div>focus-page</div> }));
jest.mock('./pages/IdeaBoxPage', () => ({ __esModule: true, default: () => <div>idea-page</div> }));
jest.mock('./pages/AdminPanelPage', () => ({ __esModule: true, default: () => <div>admin-page</div> }));
jest.mock('./pages/AboutPage', () => ({ __esModule: true, default: () => <div>about-page</div> }));
jest.mock('./pages/FaqPage', () => ({ __esModule: true, default: () => <div>faq-page</div> }));
jest.mock('./pages/SettingsPage', () => ({ __esModule: true, default: () => <div>settings-page</div> }));
jest.mock('./pages/LinksPage', () => ({ __esModule: true, default: () => <div>links-page</div> }));
jest.mock('./pages/SalesPapersPage', () => ({ __esModule: true, default: () => <div>sales-page</div> }));
jest.mock('./pages/FlashcardsPage', () => ({ __esModule: true, default: () => <div>flashcards-page</div> }));

const directRoutes: Array<[string, string]> = [
    ['/', 'home-page'],
    ['/login', 'login-page'],
    ['/register', 'register-page'],
    ['/elfelejtett-jelszo', 'forgot-page'],
    ['/uj-jelszo', 'reset-page'],
    ['/reset-password', 'reset-page'],
    ['/email-megerosites', 'verify-page'],
    ['/S3CR3T', 'secret-page'],
    ['/ai', 'ai-page'],
    ['/naptar', 'calendar-page'],
    ['/profile', 'profile-page'],
    ['/kalkulator', 'calculator-page'],
    ['/pontok', 'points-page'],
    ['/tudastar', 'knowledge-page'],
    ['/hivatkozas', 'reference-page'],
    ['/tanuloszoba', 'focus-page'],
    ['/otletlada', 'idea-page'],
    ['/admin', 'admin-page'],
    ['/about', 'about-page'],
    ['/faq', 'faq-page'],
    ['/settings', 'settings-page'],
    ['/linktar', 'links-page'],
    ['/akcios-ujsag', 'sales-page'],
    ['/kartyak', 'flashcards-page'],
];

const redirects: Array<[string, string, string]> = [
    ['/forgot-password', 'forgot-page', '/elfelejtett-jelszo'],
    ['/fokusz', 'focus-page', '/tanuloszoba'],
    ['/ideabox', 'idea-page', '/otletlada'],
    ['/links', 'links-page', '/linktar'],
    ['/flyers', 'sales-page', '/akcios-ujsag'],
    ['/flashcards', 'flashcards-page', '/kartyak'],
];

describe('App', () => {
    beforeEach(() => {
        jest.mocked(isFlyerHost).mockReturnValue(false);
        jest.mocked(isStudentProductionHost).mockReturnValue(false);
        window.history.pushState({}, '', '/');
    });

    afterEach(() => {
        cleanup();
    });

    it.each(directRoutes)('renders %s', (path, label) => {
        window.history.pushState({}, '', path);
        render(<App />);

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByText('navbar')).toBeInTheDocument();
    });

    it.each(redirects)('sends %s to %s', (path, label, destination) => {
        window.history.pushState({}, '', path);
        render(<App />);

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(window.location.pathname).toBe(destination);
    });

    it('keeps the flyer host on the sales papers page', () => {
        jest.mocked(isFlyerHost).mockReturnValue(true);
        window.history.pushState({}, '', '/login');
        render(<App />);

        expect(screen.getByText('sales-page')).toBeInTheDocument();
        expect(screen.queryByText('navbar')).not.toBeInTheDocument();
        expect(screen.queryByText('login-page')).not.toBeInTheDocument();
        expect(window.location.pathname).toBe('/');
    });

    it.each(['/akcios-ujsag', '/flyers'])('leaves %s for the flyer site on the production host', (path) => {
        jest.mocked(isStudentProductionHost).mockReturnValue(true);
        const virtualConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
        window.history.pushState({}, '', path);

        render(<App />);

        expect(screen.queryByText('sales-page')).not.toBeInTheDocument();
        expect(screen.getByText('navbar')).toBeInTheDocument();
        virtualConsole.mockRestore();
    });
});
