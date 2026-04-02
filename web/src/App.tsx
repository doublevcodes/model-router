import { Routes, Route, Link } from 'react-router-dom';
import Results from './pages/Results';
import Search from './pages/Search';

function App() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-switchboard-border bg-switchboard-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-switchboard-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            <span className="text-lg font-semibold text-white group-hover:text-switchboard-accent-light transition-colors">
              Switchboard
            </span>
          </Link>
          <div className="flex gap-6 text-sm">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">
              Benchmarks
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/runs/:id" element={<Results />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
