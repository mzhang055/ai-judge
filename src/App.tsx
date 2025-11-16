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
import { FileUpload } from './components/FileUpload';
import { JudgesPage } from './pages/JudgesPage';
import logo from './assets/besimple-logo.png';
import './App.css';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isJudgesPage = location.pathname === '/judges';

  return (
    <div className="app">
      <div
        className={
          isJudgesPage
            ? 'container container--wide'
            : 'container container--centered'
        }
      >
        <header
          className={
            isJudgesPage
              ? 'header header--horizontal'
              : 'header header--centered'
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <img src={logo} alt="BeSimple Logo" className="logo" />
            <h1>AI Judge</h1>
          </div>

          {/* Navigation - only show on Judges page */}
          {isJudgesPage && (
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
                  onUploadComplete={(count) => {
                    console.log(`Successfully uploaded ${count} submissions`);
                    // Navigate to judges page after successful upload
                    navigate('/judges');
                  }}
                  onError={(error) => {
                    console.error('Upload error:', error);
                  }}
                />
              }
            />
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
