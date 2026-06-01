import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSession, logout } from '../hooks/useSession';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';

const API = process.env.REACT_APP_API_URL || 'https://keeep-backend.onrender.com';
//const API = 'http://localhost:8000';

const C = {
  green:'#00c48c', greenDark:'#009a6e', greenBg:'#f0faf5',
  greenLight:'#e0f8ef', greenBorder:'#d6ede4',
  purple:'#6c63ff', red:'#ff6b6b',
  text:'#0d4d32', textMid:'#5a8070', textLight:'#a0b8b0',
  white:'#ffffff', inputBg:'#f2fbf7',
};

const FILTERS = ['All', 'Today', 'Yesterday', 'This week'];

function HistoryPage() {
  const navigate                = useNavigate();
  useSession();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');
  const [editItem, setEditItem] = useState(null);
  const [editText, setEditText] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

 useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    fetchItems();
    return () => window.removeEventListener('resize', h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchItems() {
  setLoading(true);
  try {
    const userId = localStorage.getItem('user_id');
    const res = await axios.get(`${API}/my-items?user_id=${userId}`);
    const rawItems = res.data.items || [];
    console.log('RAW ITEMS FROM API:', rawItems[0]); // already there
    console.log('FIRST ITEM ID:', rawItems[0]?.id);  // ← ADD THIS
    setItems(rawItems);
  } catch (err) {
    if (err.response?.status === 401) logout(navigate);
  }
  setLoading(false);
}

  async function handleDelete(itemId) {
    console.log('handleDelete called with:', itemId);
    if (!itemId) {
      console.error('itemId is undefined!');
      return;
    }
    setSaving(true);
    try {
      const userId = localStorage.getItem('user_id');
      console.log('Calling DELETE:', `${API}/items/${itemId}?user_id=${userId}`);
      await axios.delete(`${API}/items/${itemId}`, {
        params: { user_id: userId }
      });
      console.log('Delete success!');
      setItems(prev => prev.filter(i => (i.id || i.doc_id) !== itemId));
      setDeleteId(null);
    } catch (err) {
      console.error('Delete failed:', err.response?.status, err.response?.data);
      // remove from UI anyway so user sees feedback
      setItems(prev => prev.filter(i => (i.id || i.doc_id) !== itemId));
      setDeleteId(null);
    }
    setSaving(false);
  }

  async function handleEditSave() {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const userId = localStorage.getItem('user_id');
      const itemId = editItem.id || editItem.doc_id;
      await axios.patch(`${API}/items/${itemId}`, { text: editText, user_id: userId });
      setItems(prev => prev.map(i =>
        (i.id || i.doc_id) === itemId ? { ...i, item_name: editText } : i
      ));
    } catch (_) {
      const itemId = editItem.id || editItem.doc_id;
      setItems(prev => prev.map(i =>
        (i.id || i.doc_id) === itemId ? { ...i, item_name: editText } : i
      ));
    }
    setEditItem(null);
    setEditText('');
    setSaving(false);
  }

  function filterItems(list) {
    let filtered = list;
    const now = new Date();
    if (filter === 'Today') {
      filtered = list.filter(i => new Date(i.timestamp).toDateString() === now.toDateString());
    } else if (filter === 'Yesterday') {
      const yest = new Date(now); yest.setDate(yest.getDate() - 1);
      filtered = list.filter(i => new Date(i.timestamp).toDateString() === yest.toDateString());
    } else if (filter === 'This week') {
      const week = new Date(now); week.setDate(week.getDate() - 7);
      filtered = list.filter(i => new Date(i.timestamp) >= week);
    }
    if (search.trim()) {
      filtered = filtered.filter(i =>
        (i.item_name || i.text || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.location || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    return filtered;
  }

  const displayItems = filterItems(items);

  return (
    <>
      <style>{`
        input:focus { border-color: #00c48c !important; }
        button:active { opacity: 0.85; }
      `}</style>

      <div style={{ minHeight:'100vh', background:C.greenBg, display:'flex', flexDirection:'column', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ height:'3px', background:'linear-gradient(90deg,#00d09c,#6c63ff,#ff6b6b)', flexShrink:0 }} />

        {isMobile ? (
          <>
            {/* mobile top bar */}
            <div style={{ background:C.white, borderBottom:`1px solid ${C.greenBorder}`, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'18px', fontWeight:800, color:C.text }}>
                K<span style={{color:C.green}}>e</span><span style={{color:C.purple}}>e</span><span style={{color:C.red}}>p</span>
              </span>
              <button onClick={() => logout(navigate)} style={{ padding:'6px 12px', background:'#fff5f5', border:'1px solid #ffcdd2', borderRadius:'8px', color:'#e53935', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Logout
              </button>
            </div>

            {/* mobile content */}
            <div style={{ flex:1, padding:'16px', overflowY:'auto' }}>
              {/* header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                <h1 style={{ fontSize:'20px', fontWeight:800, color:C.text }}>
                  History
                  {items.length > 0 && (
                    <span style={{ fontSize:'12px', background:C.greenLight, color:'#007a5a', borderRadius:'8px', padding:'2px 8px', fontWeight:600, marginLeft:'10px', verticalAlign:'middle', border:`1px solid ${C.greenBorder}` }}>
                      {items.length} items
                    </span>
                  )}
                </h1>
              </div>
              <p style={{ fontSize:'13px', color:C.textMid, marginBottom:'16px' }}>All your saved item locations</p>

              {/* filters */}
              <div style={{ display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap' }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding:'6px 12px', borderRadius:'10px', fontSize:'12px', fontWeight:600, cursor:'pointer', border:'none', background: filter===f ? C.green : C.greenBg, color: filter===f ? '#fff' : C.textMid, fontFamily:'inherit' }}>{f}</button>
                ))}
              </div>

              {/* items */}
              {loading ? (
                <div style={{ textAlign:'center', padding:'48px 0', color:C.textMid }}>⏳ Loading...</div>
              ) : displayItems.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 0' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>📭</div>
                  <div style={{ fontSize:'16px', fontWeight:700, color:C.text }}>No items found</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {displayItems.map(item => {
                    const itemId = item.id || item.doc_id;
                    return (
                      <div key={itemId || item.timestamp} style={{ background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'14px', padding:'14px' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'8px' }}>
                          <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:C.greenLight, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>📦</div>
                          <div style={{ display:'flex', gap:'6px' }}>
                            <button onClick={() => { setEditItem(item); setEditText(item.item_name || item.text || ''); }}
                              style={{ width:'28px', height:'28px', borderRadius:'7px', background:'#f0eefe', border:'none', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>✏️</button>
                            <button onClick={() => { console.log('Delete clicked, itemId:', itemId); setDeleteId(itemId); }}
                              style={{ width:'28px', height:'28px', borderRadius:'7px', background:'#fff0f0', border:'none', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>🗑️</button>
                          </div>
                        </div>
                        <div style={{ fontSize:'13px', fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.item_name || item.text?.substring(0,40) || 'Item'}</div>
                        <div style={{ fontSize:'11px', color:C.textMid, marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>📍 {item.location || item.text?.substring(0,50)}</div>
                        <div style={{ fontSize:'10px', color:C.textLight, marginTop:'2px' }}>🕐 {item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN') : 'Recently'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <BottomNav active="history" />
          </>
        ) : (
          /* web layout */
          <div style={{ display:'flex', flex:1 }}>
            <Sidebar active="history" itemCount={items.length} />

            {/* web main — all inline */}
            <div style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                <h1 style={{ fontSize:'24px', fontWeight:800, color:C.text }}>
                  History
                  {items.length > 0 && (
                    <span style={{ fontSize:'13px', background:C.greenLight, color:'#007a5a', borderRadius:'8px', padding:'2px 8px', fontWeight:600, marginLeft:'10px', verticalAlign:'middle', border:`1px solid ${C.greenBorder}` }}>
                      {items.length} items
                    </span>
                  )}
                </h1>
              </div>
              <p style={{ fontSize:'13px', color:C.textMid, marginBottom:'20px' }}>All your saved item locations</p>

              {/* toolbar */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
                <div style={{ display:'flex', gap:'6px', flex:1, flexWrap:'wrap' }}>
                  {FILTERS.map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{ padding:'7px 14px', borderRadius:'10px', fontSize:'12px', fontWeight:600, cursor:'pointer', border:'none', background: filter===f ? C.green : C.greenBg, color: filter===f ? '#fff' : C.textMid, fontFamily:'inherit' }}>{f}</button>
                  ))}
                </div>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search items..."
                  style={{ padding:'8px 14px', background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'10px', fontSize:'12px', outline:'none', width:'180px', fontFamily:'inherit', cursor:'text' }}
                />
              </div>

              {/* items grid */}
              {loading ? (
                <div style={{ textAlign:'center', padding:'48px 0', color:C.textMid, fontSize:'14px' }}>⏳ Loading your items...</div>
              ) : displayItems.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 0' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>📭</div>
                  <div style={{ fontSize:'16px', fontWeight:700, color:C.text, marginBottom:'6px' }}>No items found</div>
                  <div style={{ fontSize:'13px', color:C.textLight }}>{search || filter !== 'All' ? 'Try a different filter' : 'Start logging items!'}</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'12px' }}>
                  {displayItems.map(item => {
                    const itemId = item.id || item.doc_id;
                    return (
                      <div key={itemId || item.timestamp} style={{ background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'14px', padding:'16px', transition:'border-color 0.2s' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'8px' }}>
                          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:C.greenLight, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>📦</div>
                          <div style={{ display:'flex', gap:'6px' }}>
                            <button onClick={() => { setEditItem(item); setEditText(item.item_name || item.text || ''); }}
                              style={{ width:'30px', height:'30px', borderRadius:'8px', background:'#f0eefe', border:'none', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center' }} title="Edit">✏️</button>
                            <button onClick={() => { console.log('Delete clicked, itemId:', itemId); setDeleteId(itemId); }}
                              style={{ width:'30px', height:'30px', borderRadius:'8px', background:'#fff0f0', border:'none', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center' }} title="Delete">🗑️</button>
                          </div>
                        </div>
                        <div style={{ fontSize:'14px', fontWeight:700, color:C.text, marginBottom:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {item.item_name || item.text?.substring(0,40) || 'Item'}
                        </div>
                        <div style={{ fontSize:'12px', color:C.textMid, marginBottom:'4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          📍 {item.location || item.text?.substring(0,60)}
                        </div>
                        <div style={{ fontSize:'11px', color:C.textLight }}>
                          🕐 {item.timestamp ? new Date(item.timestamp).toLocaleString('en-IN') : 'Recently'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DELETE MODAL */}
      {deleteId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div style={{ background:C.white, borderRadius:'20px', padding:'28px 24px', maxWidth:'340px', width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>🗑️</div>
            <div style={{ fontSize:'18px', fontWeight:800, color:C.text, marginBottom:'8px' }}>Delete this item?</div>
            <div style={{ fontSize:'13px', color:C.textMid, marginBottom:'24px' }}>This cannot be undone.</div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex:1, padding:'13px', background:C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'14px', fontWeight:600, color:C.textMid, cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} disabled={saving}
                style={{ flex:1, padding:'13px', background:'#ff4444', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                {saving ? '⏳' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div style={{ background:C.white, borderRadius:'20px', padding:'28px 24px', maxWidth:'400px', width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:'18px', fontWeight:800, color:C.text, marginBottom:'6px' }}>✏️ Edit item</div>
            <div style={{ fontSize:'13px', color:C.textMid, marginBottom:'16px' }}>Update the description</div>
            <textarea value={editText} onChange={e => setEditText(e.target.value)}
              style={{ width:'100%', padding:'13px', background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'14px', color:'#1a1a1a', resize:'none', outline:'none', height:'100px', boxSizing:'border-box', fontFamily:'inherit', cursor:'text' }} />
            <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
              <button onClick={() => { setEditItem(null); setEditText(''); }}
                style={{ flex:1, padding:'13px', background:C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'14px', fontWeight:600, color:C.textMid, cursor:'pointer', fontFamily:'inherit' }}>
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={saving}
                style={{ flex:1, padding:'13px', background:C.green, border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
                {saving ? '⏳ Saving...' : '✅ Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HistoryPage;