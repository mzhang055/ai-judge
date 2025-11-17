/**
 * Main App component with routing
 */
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import { FileUpload } from './components/FileUpload';
import { JudgesPage } from './pages/JudgesPage';
import { QueuesPage } from './pages/QueuesPage';
import { QueuePage } from './pages/QueuePage';
import { ResultsPage } from './pages/ResultsPage';
import logo from './assets/besimple-logo.png';
import './App.css';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDataIngestionPage = location.pathname === '/';

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
          isDataIngestionPage
            ? 'container container--centered'
            : 'container container--wide'
        }
      >
        <header
          className={
            isDataIngestionPage
              ? 'header header--centered'
              : 'header header--horizontal'
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <img src={logo} alt="BeSimple Logo" className="logo" />
            <h1>AI Judge</h1>
          </div>
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
            <Route path="/queues/:queueId/results" element={<ResultsPage />} />
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

export default App;
