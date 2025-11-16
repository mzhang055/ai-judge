/**
 * Main App component
 */
import { FileUpload } from './components/FileUpload';
import logo from './assets/besimple-logo.png';
import './App.css';

function App() {
  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <img src={logo} alt="BeSimple Logo" className="logo" />
          <h1>AI Judge</h1>
        </header>

        <main className="main">
          <FileUpload
            onUploadComplete={(count) => {
              console.log(`Successfully uploaded ${count} submissions`);
            }}
            onError={(error) => {
              console.error('Upload error:', error);
            }}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
