import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://keeep-backend.onrender.com';

const EMOJI = { key:'🗝️',keys:'🗝️',passport:'📘',glasses:'👓',phone:'📱',medicine:'💊',medicines:'💊',wallet:'👛',laptop:'💻',charger:'🔌',book:'📚',watch:'⌚',card:'💳',aadhaar:'💳' };

function getEmoji(name) {
  if (!name) return '📦';
  const l = name.toLowerCase();
  for (const [k, v] of Object.entries(EMOJI)) if (l.includes(k)) return v;
  return '📦';
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d/60) + 'm ago';
  if (d < 86400) return Math.floor(d/3600) + 'h ago';
  return Math.floor(d/86400) + 'd ago';
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const userId = localStorage.getItem('user_id') || 'neha123';

  useEffect(() => {
    async function fetchItems() {
      try {
        const response = await axios.get(API + '/my-items', { params: { user_id: userId } });
        setItems(response.data.items || []);
      } catch (err) { console.error('Error fetching items'); }
      setLoading(false);
    }
    fetchItems();
  }, []);

  const rooms = ['All', ...new Set(items.map(i => cap(i.room)).filter(r => r && r !== 'Unknown'))];
  const filtered = filter === 'All' ? items : items.filter(i => cap(i.room) === filter);
  const roomCount = new Set(items.map(i => i.room).filter(r => r && r !== 'unknown')).size;

  return (
    <div className="app-container">

      {/* Header */}
      <div className="g-header">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '700', letterSpacing: '-0.3px' }}>History</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', marginTop: '4px' }}>{items.length} items tracked</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '8px 14px', textAlign: 'center' }}>
            <p style={{ color: 'white', fontSize: '20px', fontWeight: '700', lineHeight: '1' }}>{roomCount}</p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rooms</p>
          </div>
        </div>

        {/* Room filters */}
        {rooms.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {rooms.map(room => (
              <button key={room} onClick={() => setFilter(room)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', cursor: 'pointer',
                  background: filter === room ? 'white' : 'rgba(255,255,255,0.15)',
                  border: 'none', whiteSpace: 'nowrap',
                  color: filter === room ? '#1a6b3a' : 'rgba(255,255,255,0.7)',
                  fontSize: '12px', fontWeight: filter === room ? '600' : '400',
                  transition: 'all 0.2s', fontFamily: 'Inter, sans-serif'
                }}
              >{room}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '16px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#ccc', fontSize: '14px' }}>
            Loading your items...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: '0.2' }}>📭</div>
            <p style={{ color: '#bbb', fontSize: '14px', lineHeight: '1.6' }}>
              No items found.<br />Go to <strong style={{ color: '#1a6b3a' }}>Log</strong> to start tracking!
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="card" style={{ padding: '8px 14px' }}>
            {filtered.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px 0',
                borderBottom: i < filtered.length - 1 ? '1px solid #f5f5f5' : 'none',
                cursor: 'pointer', transition: 'all 0.15s',
                animationDelay: `${i * 0.04}s`
              }}>
                <div style={{ width: '44px', height: '44px', background: 'rgba(26,107,58,0.08)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  {getEmoji(item.item_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '15px', fontWeight: '600', color: '#111', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cap(item.item_name) || 'Item'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    📍 {cap(item.location)} · {timeAgo(item.timestamp)}
                  </p>
                </div>
                <span className="g-badge">{cap(item.room) || 'Unknown'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;
