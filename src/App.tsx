import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

type Page = 'loading' | 'login' | 'register' | 'dashboard';

export interface UserInfo {
  id: number;
  nama: string;
  username: string;
}

function App() {
  const [page, setPage] = useState<Page>('loading');
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    invoke<UserInfo>('check_auth')
      .then((u) => {
        setUser(u);
        setPage('dashboard');
      })
      .catch(() => {
        setPage('login');
      });
  }, []);

  const handleLogout = async () => {
    try {
      await invoke('logout');
    } catch {
      // ignore
    }
    setUser(null);
    setPage('login');
  };

  if (page === 'loading') {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner"></div>
      </div>
    );
  }

  if (page === 'login') {
    return (
      <LoginPage
        onLoginSuccess={(u) => {
          setUser(u);
          setPage('dashboard');
        }}
        onGoToRegister={() => setPage('register')}
      />
    );
  }

  if (page === 'register') {
    return (
      <RegisterPage
        onRegisterSuccess={() => setPage('login')}
        onGoToLogin={() => setPage('login')}
      />
    );
  }

  return <DashboardLayout user={user!} onLogout={handleLogout} />;
}

export default App;
