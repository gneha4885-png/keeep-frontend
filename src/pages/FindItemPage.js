import { useState } from 'react';
import axios from 'axios';

const API = 'https://keeep-backend.onrender.com';

function FindItemPage() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [searches, setSearches] = useState([]);
  const userId = localStorage.getItem('user_id') || 'neha123';

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function handleFind(q) {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true); setAnswer('');
    try {
      const response = await axios.get(API + '/find-item', { params: { query: searchQuery, user_id: userId } });
      setAnswer(response.data.answer);
      setSearches(prev => [searchQuery, ...prev.filter(s => s !== searchQuery).slice(0, 3)]);
    } catch (err) {
      showToast('Cannot connect to server');
    }
    setLoading(false);
  }

  const quickSearches = ['Where are my keys?', 'Where is my passport?', 'Where are my glasses?', 'Where are my medicines?'];

  return (
    <div className="app-container">

      {/* Header */}
      <div className="g-header">
        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '700', letterSpacing: '-0.3px' }}>Find Item</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', marginTop: '4px' }}>Ask AI where you kept something</p>
      </div>

      <div style={{ padding: '16px' }}>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input className="input-light"
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFind()}
            placeholder="Where are my car keys?"
            style={{ paddingRight: '52px', background: 'white' }}
          />
          <button onClick={() => handleFind()} style={{
            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #1a6b3a, #2d9e5a)',
            border: 'none', borderRadius: '10px', cursor: 'pointer',
            fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(26,107,58,0.3)'
          }}>🔍</button>
        </div>

        {/* Quick searches */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {quickSearches.map((q, i) => (
            <button key={i} onClick={() => { setQuery(q); handleFind(q); }}
              className="g-chip" style={{ fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
              {q}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
            <p style={{ color: '#999', fontSize: '14px' }}>AI is searching your items...</p>
            <div style={{ width: '100px', height: '3px', background: '#f0f5f0', borderRadius: '2px', margin: '16px auto 0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '40%', background: 'linear-gradient(90deg, #1a6b3a, #2d9e5a)', borderRadius: '2px', animation: 'slide 1s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        {/* Answer */}
        {answer && !loading && (
          <div className="card animate-up" style={{ border: '1px solid rgba(26,107,58,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', background: 'rgba(26,107,58,0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🤖</div>
              <div>
                <p style={{ fontSize: '12px', color: '#1a6b3a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>AI Found It</p>
                <p style={{ fontSize: '11px', color: '#999', marginTop: '1px' }}>Powered by Claude</p>
              </div>
            </div>
            <div style={{ height: '1px', background: '#f0f5f0', marginBottom: '12px' }} />
            <p style={{ fontSize: '15px', lineHeight: '1.7', color: '#222' }}>{answer}</p>
            <button onClick={() => { setAnswer(''); setQuery(''); }}
              style={{ marginTop: '14px', background: 'none', border: 'none', color: '#ccc', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Clear result
            </button>
          </div>
        )}

        {/* Empty state */}
        {!answer && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: '0.3' }}>🔍</div>
            <p style={{ fontSize: '14px', color: '#bbb', lineHeight: '1.6' }}>
              Type a question or tap<br />a quick search above
            </p>
          </div>
        )}

        {/* Recent searches */}
        {searches.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <p className="label" style={{ marginBottom: '10px' }}>Recent searches</p>
            {searches.map((s, i) => (
              <div key={i} onClick={() => { setQuery(s); handleFind(s); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: 'white', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer', border: '1px solid #f0f5f0', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(26,107,58,0.2)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#f0f5f0'}
              >
                <span style={{ color: '#ccc', fontSize: '14px' }}>🕐</span>
                <span style={{ fontSize: '13px', color: '#666' }}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
      <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`}</style>
    </div>
  );
}

export default FindItemPage;
