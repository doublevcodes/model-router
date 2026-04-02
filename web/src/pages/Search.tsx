import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { BenchmarkRunRow } from '../types';

export default function Search() {
  const [runs, setRuns] = useState<BenchmarkRunRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/runs');
      if (!res.ok) throw new Error('Failed to fetch runs');
      const data = await res.json();
      setRuns(data.runs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      fetchRuns();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setRuns(data.runs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
      running: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
      pending: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
      failed: 'bg-red-500/15 text-red-400 border-red-500/20',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.pending}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Benchmark Runs</h1>
        <p className="text-gray-400">
          Browse shared benchmark results from the community.
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search use cases..."
          className="flex-1 bg-switchboard-card border border-switchboard-border rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-switchboard-accent/50 focus:border-switchboard-accent"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-2.5 bg-switchboard-accent text-white rounded-lg font-medium hover:bg-switchboard-accent-light transition-colors"
        >
          Search
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-switchboard-accent border-t-transparent rounded-full" />
        </div>
      ) : runs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No benchmark runs found</p>
          <p className="text-sm">
            Use the Switchboard MCP in Cursor to create your first benchmark.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <Link
              key={run.id}
              to={`/runs/${run.id}`}
              className="block bg-switchboard-card border border-switchboard-border rounded-xl p-5 hover:border-switchboard-accent/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-medium group-hover:text-switchboard-accent-light transition-colors">
                    {run.use_case}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>
                      {new Date(run.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="font-mono">{run.id.slice(0, 8)}</span>
                  </div>
                </div>
                {statusBadge(run.status)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
