import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSession, logout } from '../hooks/useSession';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';

const API = process.env.REACT_APP_API_URL || 'https://keeep-backend.onrender.com';

const C = {
  green:'#00c48c', greenDark:'#009a6e', greenBg:'#f0faf5',
  greenLight:'#e0f8ef', greenBorder:'#d6ede4',
  purple:'#6c63ff', red:'#ff6b6b',
  text:'#0d4d32', textMid:'#5a8070', textLight:'#a0b8b0',
  white:'#ffffff', inputBg:'#f2fbf7',
};

const FILTERS = ['All', 'Today', 'Yesterday', 'This week'];

function formatIST(timestamp, dateOnly = false) {
  if (!timestamp) return 'Recently';
  try {
    const ts = timestamp.includes('+') || timestamp.includes('Z')
      ? timestamp : timestamp + 'Z';
    const date = new Date(ts);
    if (dateOnly) return date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch { return timestamp; }
}

function formatReminderIST(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ── Item Thumbnail ────────────────────────────────────────────
const ItemThumb = ({ item, size, onClick }) => {
  const s = size || 36;
  if (item.photo_url) {
    return (
      <img src={item.photo_url} alt={item.item_name || 'item'} onClick={onClick}
        style={{ width:`${s}px`, height:`${s}px`, borderRadius:'10px', objectFit:'cover', flexShrink:0, cursor: onClick ? 'pointer' : 'default' }} />
    );
  }
  return (
    <div style={{ width:`${s}px`, height:`${s}px`, borderRadius:'10px', background:'#e0f8ef', display:'flex', alignItems:'center', justifyContent:'center', fontSize:`${Math.floor(s*0.5)}px`, flexShrink:0 }}>
      📦
    </div>
  );
};

function HistoryPage() {
  const navigate = useNavigate();
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
  const [photoModal, setPhotoModal]       = useState(null);

  // ── NEW: reminder edit state ──────────────────────────────
  const [reminderModal, setReminderModal] = useState(null); // item
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');

  useEffect(() => { fetchItems(); }, []); // eslint-disable-line

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const userId = localStorage.getItem('user_id');
      const res = await axios.get(`${API}/my-items?user_id=${userId}`);
      setItems(res.data.items || []);
    } catch (err) {
      if (err.response?.status === 401) logout(navigate);
    }
    setLoading(false);
  }

  async function handleDelete(itemId) {
    if (!itemId) return;
    setSaving(true);
    try {
      const userId = localStorage.getItem('user_id');
      await axios.delete(`${API}/items/${itemId}`, { params: { user_id: userId } });
      setItems(prev => prev.filter(i => (i.id || i.doc_id) !== itemId));
      setDeleteId(null);
    } catch {
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
      setItems(prev => prev.map(i => (i.id || i.doc_id) === itemId ? { ...i, item_name: editText } : i));
    } catch {
      const itemId = editItem.id || editItem.doc_id;
      setItems(prev => prev.map(i => (i.id || i.doc_id) === itemId ? { ...i, item_name: editText } : i));
    }
    setEditItem(null); setEditText(''); setSaving(false);
  }

  // ── NEW: open reminder edit modal ─────────────────────────
  function openReminderModal(item) {
    setReminderModal(item);
    const existing = item.reminder_time;
    if (existing) {
      const d = new Date(existing);
      const offset = 5.5 * 60 * 60 * 1000;
      const ist = new Date(d.getTime() + offset);
      setNewReminderDate(ist.toISOString().split('T')[0]);
      setNewReminderTime(ist.toISOString().split('T')[1].slice(0,5));
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      setNewReminderDate(now.toISOString().split('T')[0]);
      const hh = String(now.getHours()).padStart(2,'0');
      const mm = String(now.getMinutes()).padStart(2,'0');
      setNewReminderTime(`${hh}:${mm}`);
    }
  }

  // ── NEW: save reminder ────────────────────────────────────
  async function handleReminderSave() {
    if (!newReminderDate || !newReminderTime) return;
    setSaving(true);
    try {
      const reminderISO = new Date(`${newReminderDate}T${newReminderTime}:00`).toISOString();
      const userId  = localStorage.getItem('user_id');
      const itemId  = reminderModal.id || reminderModal.doc_id;
      await axios.patch(`${API}/items/${itemId}`, {
        text: reminderModal.item_name,
        user_id: userId,
        reminder_time: reminderISO,
      });
      setItems(prev => prev.map(i => (i.id || i.doc_id) === itemId ? { ...i, reminder_time: reminderISO } : i));
      // Schedule browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const delay = new Date(reminderISO).getTime() - Date.now();
        if (delay > 0) {
          setTimeout(() => {
            new Notification('⏰ Keeep Reminder', {
              body: `"${reminderModal.item_name}" is in ${reminderModal.location}. Time to use it!`,
              icon: '/logo192.png',
            });
          }, delay);
        }
      }
    } catch (e) { console.error(e); }
    setReminderModal(null); setSaving(false);
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
  const minDate = new Date().toISOString().split('T')[0];

  // ── Item card renderer ────────────────────────────────────
  const renderCard = (item, isMob) => {
    const itemId = item.id || item.doc_id;
    const hasReminder = item.reminder_time && item.reminder_time !== '';
    const reminderPast = hasReminder && new Date(item.reminder_time) < new Date();

    return (
      <div key={itemId || item.timestamp}
        style={{ background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'14px', padding: isMob ? '14px' : '16px', position:'relative' }}>

        {/* Reminder badge */}
        {hasReminder && (
          <div style={{ position:'absolute', top:'10px', right: isMob ? '70px' : '76px', background: reminderPast ? '#fff3e0' : C.greenLight, border:`1px solid ${reminderPast ? '#ffb74d' : C.greenBorder}`, borderRadius:'8px', padding:'2px 7px', fontSize:'10px', fontWeight:700, color: reminderPast ? '#e65100' : C.greenDark, display:'flex', alignItems:'center', gap:'3px' }}>
            🔔 {reminderPast ? 'Done' : formatReminderIST(item.reminder_time)}
          </div>
        )}

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'8px', marginTop: hasReminder ? '20px' : '0' }}>
          <ItemThumb item={item} size={44} onClick={() => item.photo_url && setPhotoModal(item)} />
          <div style={{ display:'flex', gap:'6px' }}>
            {/* Reminder edit button */}
            <button onClick={() => openReminderModal(item)}
              title="Set/Edit Reminder"
              style={{ width: isMob ? '28px' : '30px', height: isMob ? '28px' : '30px', borderRadius:'8px', background:'#fff8e1', border:'none', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>
              🔔
            </button>
            <button onClick={() => { setEditItem(item); setEditText(item.item_name || item.text || ''); }}
              style={{ width: isMob ? '28px' : '30px', height: isMob ? '28px' : '30px', borderRadius:'8px', background:'#f0eefe', border:'none', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>✏️</button>
            <button onClick={() => setDeleteId(itemId)}
              style={{ width: isMob ? '28px' : '30px', height: isMob ? '28px' : '30px', borderRadius:'8px', background:'#fff0f0', border:'none', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center' }}>🗑️</button>
          </div>
        </div>

        <div style={{ fontSize: isMob ? '13px' : '14px', fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {item.item_name || item.text?.substring(0,40) || 'Item'}
        </div>
        <div style={{ fontSize: isMob ? '11px' : '12px', color:C.textMid, marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          📍 {item.location || item.text?.substring(0,50)}
        </div>
        <div style={{ fontSize:'10px', color:C.textLight, marginTop:'2px' }}>
          🕐 {item.timestamp ? formatIST(item.timestamp) : 'Recently'}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`input:focus { border-color: #00c48c !important; } button:active { opacity: 0.85; }`}</style>

      <div style={{ minHeight:'100vh', background:C.greenBg, display:'flex', flexDirection:'column', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ height:'3px', background:'linear-gradient(90deg,#00d09c,#6c63ff,#ff6b6b)', flexShrink:0 }} />

        {isMobile ? (
          <>
            <div style={{ background:C.white, borderBottom:`1px solid ${C.greenBorder}`, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'18px', fontWeight:800, color:C.text }}>
                K<span style={{color:C.green}}>e</span><span style={{color:C.purple}}>e</span><span style={{color:C.red}}>e</span>p
              </span>
              <button onClick={() => logout(navigate)} style={{ padding:'6px 12px', background:'#fff5f5', border:'1px solid #ffcdd2', borderRadius:'8px', color:'#e53935', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>Logout</button>
            </div>
            <div style={{ flex:1, padding:'16px', overflowY:'auto' }}>
              <h1 style={{ fontSize:'20px', fontWeight:800, color:C.text, marginBottom:'4px' }}>
                History {items.length > 0 && <span style={{ fontSize:'12px', background:C.greenLight, color:'#007a5a', borderRadius:'8px', padding:'2px 8px', fontWeight:600, marginLeft:'8px', border:`1px solid ${C.greenBorder}` }}>{items.length}</span>}
              </h1>
              <p style={{ fontSize:'13px', color:C.textMid, marginBottom:'16px' }}>All your saved item locations</p>
              <div style={{ display:'flex', gap:'6px', marginBottom:'12px', flexWrap:'wrap' }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ padding:'6px 12px', borderRadius:'10px', fontSize:'12px', fontWeight:600, cursor:'pointer', border:'none', background: filter===f ? C.green : C.greenBg, color: filter===f ? '#fff' : C.textMid }}>
                    {f}
                  </button>
                ))}
              </div>
              {loading ? <div style={{ textAlign:'center', padding:'48px 0', color:C.textMid }}>⏳ Loading...</div>
              : displayItems.length === 0 ? <div style={{ textAlign:'center', padding:'48px 0' }}><div style={{ fontSize:'48px' }}>📭</div><div style={{ fontWeight:700, color:C.text }}>No items found</div></div>
              : <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>{displayItems.map(item => renderCard(item, true))}</div>}
            </div>
            <BottomNav active="history" />
          </>
        ) : (
          <div style={{ display:'flex', flex:1 }}>
            <Sidebar active="history" itemCount={items.length} />
            <div style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
              <h1 style={{ fontSize:'24px', fontWeight:800, color:C.text, marginBottom:'4px' }}>
                History {items.length > 0 && <span style={{ fontSize:'13px', background:C.greenLight, color:'#007a5a', borderRadius:'8px', padding:'2px 8px', fontWeight:600, marginLeft:'10px', border:`1px solid ${C.greenBorder}` }}>{items.length} items</span>}
              </h1>
              <p style={{ fontSize:'13px', color:C.textMid, marginBottom:'20px' }}>All your saved item locations</p>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
                <div style={{ display:'flex', gap:'6px', flex:1, flexWrap:'wrap' }}>
                  {FILTERS.map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{ padding:'7px 14px', borderRadius:'10px', fontSize:'12px', fontWeight:600, cursor:'pointer', border:'none', background: filter===f ? C.green : C.greenBg, color: filter===f ? '#fff' : C.textMid }}>
                      {f}
                    </button>
                  ))}
                </div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
                  style={{ padding:'8px 14px', background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'10px', fontSize:'12px', outline:'none', width:'180px' }} />
              </div>
              {loading ? <div style={{ textAlign:'center', padding:'48px 0', color:C.textMid }}>⏳ Loading your items...</div>
              : displayItems.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 0' }}>
                  <div style={{ fontSize:'48px', marginBottom:'12px' }}>📭</div>
                  <div style={{ fontSize:'16px', fontWeight:700, color:C.text, marginBottom:'6px' }}>No items found</div>
                  <div style={{ fontSize:'13px', color:C.textLight }}>{search || filter !== 'All' ? 'Try a different filter' : 'Start logging items!'}</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'12px' }}>
                  {displayItems.map(item => renderCard(item, false))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── PHOTO MODAL ── */}
      {photoModal && (
        <div onClick={() => setPhotoModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:2000, padding:'20px', cursor:'pointer' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:C.white, borderRadius:'20px', overflow:'hidden', maxWidth:'500px', width:'100%' }}>
            <img src={photoModal.photo_url} alt={photoModal.item_name} style={{ width:'100%', maxHeight:'60vh', objectFit:'contain', background:'#000' }} />
            <div style={{ padding:'16px 20px' }}>
              <div style={{ fontSize:'16px', fontWeight:800, color:C.text }}>{photoModal.item_name}</div>
              <div style={{ fontSize:'13px', color:C.textMid }}>📍 {photoModal.location}</div>
            </div>
            <div style={{ padding:'0 20px 16px' }}>
              <button onClick={() => setPhotoModal(null)} style={{ width:'100%', padding:'12px', background:C.green, border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, color:'#fff', cursor:'pointer' }}>✕ Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── REMINDER EDIT MODAL ── */}
      {reminderModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div style={{ background:C.white, borderRadius:'20px', padding:'28px 24px', maxWidth:'380px', width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:'18px', fontWeight:800, color:C.text, marginBottom:'4px' }}>🔔 Set Reminder</div>
            <div style={{ fontSize:'13px', color:C.textMid, marginBottom:'20px' }}>
              For: <strong>{reminderModal.item_name}</strong> in {reminderModal.location}
            </div>
            <div style={{ display:'flex', gap:'10px', marginBottom:'16px' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'11px', fontWeight:600, color:C.textLight, marginBottom:'4px' }}>📅 Date</div>
                <input type="date" min={minDate} value={newReminderDate} onChange={e => setNewReminderDate(e.target.value)}
                  style={{ width:'100%', background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'8px', padding:'8px 10px', fontSize:'13px', color:C.text, outline:'none', boxSizing:'border-box' }} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'11px', fontWeight:600, color:C.textLight, marginBottom:'4px' }}>⏰ Time</div>
                <input type="time" value={newReminderTime} onChange={e => setNewReminderTime(e.target.value)}
                  style={{ width:'100%', background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'8px', padding:'8px 10px', fontSize:'13px', color:C.text, outline:'none', boxSizing:'border-box' }} />
              </div>
            </div>
            {newReminderDate && newReminderTime && (
              <p style={{ fontSize:'12px', color:C.textMid, background:C.greenLight, padding:'8px 10px', borderRadius:'6px', border:`1px solid ${C.greenBorder}`, marginBottom:'16px' }}>
                Will remind on <strong>{new Date(`${newReminderDate}T${newReminderTime}`).toLocaleString('en-IN',{ day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</strong>
              </p>
            )}
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setReminderModal(null)} style={{ flex:1, padding:'13px', background:C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'14px', fontWeight:600, color:C.textMid, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={handleReminderSave} disabled={saving} style={{ flex:1, padding:'13px', background:C.green, border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, color:'#fff', cursor:'pointer' }}>
                {saving ? '⏳' : '🔔 Save Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {deleteId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div style={{ background:C.white, borderRadius:'20px', padding:'28px 24px', maxWidth:'340px', width:'100%', textAlign:'center' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>🗑️</div>
            <div style={{ fontSize:'18px', fontWeight:800, color:C.text, marginBottom:'8px' }}>Delete this item?</div>
            <div style={{ fontSize:'13px', color:C.textMid, marginBottom:'24px' }}>This cannot be undone.</div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setDeleteId(null)} style={{ flex:1, padding:'13px', background:C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'14px', fontWeight:600, color:C.textMid, cursor:'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} disabled={saving} style={{ flex:1, padding:'13px', background:'#ff4444', border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, color:'#fff', cursor:'pointer' }}>
                {saving ? '⏳' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div style={{ background:C.white, borderRadius:'20px', padding:'28px 24px', maxWidth:'400px', width:'100%' }}>
            <div style={{ fontSize:'18px', fontWeight:800, color:C.text, marginBottom:'6px' }}>✏️ Edit item</div>
            <div style={{ fontSize:'13px', color:C.textMid, marginBottom:'16px' }}>Update the description</div>
            <textarea value={editText} onChange={e => setEditText(e.target.value)}
              style={{ width:'100%', padding:'13px', background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'14px', color:'#1a1a1a', resize:'none', outline:'none', height:'100px', boxSizing:'border-box', fontFamily:'inherit' }} />
            <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
              <button onClick={() => { setEditItem(null); setEditText(''); }} style={{ flex:1, padding:'13px', background:C.greenBg, border:`1px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'14px', fontWeight:600, color:C.textMid, cursor:'pointer' }}>Cancel</button>
              <button onClick={handleEditSave} disabled={saving} style={{ flex:1, padding:'13px', background:C.green, border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, color:'#fff', cursor:'pointer' }}>
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