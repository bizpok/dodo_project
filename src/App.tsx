import { useCallback, useEffect, useState } from 'react';
import { PasswordRecoveryModal } from './components/AccountRecoveryModal';
import { Layout, TABS, type Tab } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HomePage } from './pages/HomePage';
import { HelpPage } from './pages/HelpPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { TasksPage } from './pages/TasksPage';
import { useStore } from './store';

function resolveInitialTab(): Tab {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const rawHash = window.location.hash.replace(/^#\/?/, '');
  const search = window.location.search;
  const token = rawHash || path.replace(/^\//, '');

  if (
    rawHash.includes('access_token=') ||
    rawHash.includes('type=recovery') ||
    rawHash.includes('error_description=') ||
    rawHash.includes('error=') ||
    search.includes('code=') ||
    search.includes('type=recovery') ||
    token === 'login' ||
    token === 'signup' ||
    token === 'dashboard' ||
    token === 'hierarchy' ||
    token === 'home' ||
    token === ''
  ) {
    return 'home';
  }

  if (token === 'tasks' || token === 'projects') return 'projects';
  if (token === 'help' || token === 'guide') return 'help';
  if (token === 'profile') return 'profile';
  if (token === 'privacy' || token === 'privacy-policy') return 'privacy';
  if (TABS.some((t) => t.id === token)) return token as Tab;

  return 'home';
}

function AppRouter() {
  const [tab, setTab] = useState<Tab>(() => {
    const initial = resolveInitialTab();
    const rawHash = window.location.hash.replace(/^#\/?/, '');
    const search = window.location.search;

    const hasAuthParams =
      rawHash.includes('access_token') ||
      rawHash.includes('type=recovery') ||
      rawHash.includes('error') ||
      search.includes('code=') ||
      search.includes('type=recovery');

    if (!hasAuthParams && (rawHash === 'login' || rawHash === 'signup' || rawHash === '')) {
      window.history.replaceState(null, '', '#home');
      return 'home';
    }
    return initial;
  });

  const setAuthUser = useStore((s) => s.setAuthUser);
  const { user, loading } = useAuth();

  useEffect(() => {
    const onRouteChange = () => setTab(resolveInitialTab());
    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);
    return () => {
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setAuthUser(user?.id ?? null);
    }
  }, [loading, user, setAuthUser]);

  const navigateToTab = useCallback((nextTab: Tab = 'home') => {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
    window.location.hash = nextTab;
    setTab(nextTab);
    window.scrollTo({ top: 0 });
  }, []);

  const focusHomeAuth = useCallback(() => {
    navigateToTab('home');
    requestAnimationFrame(() => {
      const emailInput = document.getElementById('home-auth-email') as HTMLInputElement | null;
      emailInput?.focus();
    });
  }, [navigateToTab]);

  if (tab === 'profile') {
    return (
      <ProtectedRoute onRedirectLogin={focusHomeAuth}>
        <Layout tab={tab} onTab={navigateToTab} onLogin={focusHomeAuth}>
          <ProfilePage />
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <Layout tab={tab} onTab={navigateToTab} onLogin={focusHomeAuth}>
      {tab === 'home' && <HomePage onTab={navigateToTab} />}
      {tab === 'projects' && <TasksPage />}
      {tab === 'settings' && <SettingsPage onTab={navigateToTab} />}
      {tab === 'help' && <HelpPage onTab={navigateToTab} />}
      {tab === 'privacy' && <PrivacyPolicyPage onBack={() => navigateToTab('home')} />}
    </Layout>
  );
}

export default function App() {
  const dark = useStore((s) => s.darkMode);
  const fontScale = useStore((s) => s.fontScale);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font-scale', fontScale);
  }, [fontScale]);

  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
        <PasswordRecoveryModal />
      </AuthProvider>
    </ToastProvider>
  );
}
