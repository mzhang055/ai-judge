/**
 * Main App component with routing
 */
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { FileUpload } from './components/FileUpload';
import { JudgesPage } from './pages/JudgesPage';
import { QueuesPage } from './pages/QueuesPage';
import { QueuePage } from './pages/QueuePage';
import logo from './assets/besimple-logo.png';
import './App.css';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDataIngestionPage = location.pathname === '/';
  const showNavigation = !isDataIngestionPage;

  const handleUploadComplete = useCallback(() => {
    // Successfully uploaded, navigate to queues page
    navigate('/queues');
  }, [navigate]);

  const handleUploadError = useCallback(() => {
    // Error is already displayed in FileUpload component
  }, []);

  return (
    <div className="app">
      <div
        className={
          showNavigation
            ? 'container container--wide'
            : 'container container--centered'
        }
      >
        <header
          className={
            showNavigation
              ? 'header header--horizontal'
              : 'header header--centered'
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <img src={logo} alt="BeSimple Logo" className="logo" />
            <h1>AI Judge</h1>
          </div>

          {/* Navigation - show on all pages except data ingestion */}
          {showNavigation && (
            <nav style={styles.nav}>
              <Link
                to="/"
                style={{
                  ...styles.navLink,
                  ...(location.pathname === '/' ? styles.navLinkActive : {}),
                }}
              >
                Data Ingestion
              </Link>
              <Link
                to="/queues"
                style={{
                  ...styles.navLink,
                  ...(location.pathname.startsWith('/queues')
                    ? styles.navLinkActive
                    : {}),
                }}
              >
                Queues
              </Link>
              <Link
                to="/judges"
                style={{
                  ...styles.navLink,
                  ...(location.pathname === '/judges'
                    ? styles.navLinkActive
                    : {}),
                }}
              >
                Judges
              </Link>
            </nav>
          )}
        </header>

        <main className="main">
          <Routes>
            <Route
              path="/"
              element={
                <FileUpload
                  onUploadComplete={handleUploadComplete}
                  onError={handleUploadError}
                />
              }
            />
            <Route path="/queues" element={<QueuesPage />} />
            <Route path="/queues/:queueId" element={<QueuePage />} />
            <Route path="/judges" element={<JudgesPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <AppContent />
    </BrowserRouter>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    gap: '8px',
    padding: '4px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
  },
  navLink: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    textDecoration: 'none',
    borderRadius: '6px',
    transition: 'all 0.15s',
  },
  navLinkActive: {
    backgroundColor: '#fff',
    color: '#4f46e5',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
};

export default App;
