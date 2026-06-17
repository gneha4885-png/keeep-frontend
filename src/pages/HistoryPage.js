import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSession, logout } from '../hooks/useSession';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import { Plus, Trash2 } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://keeep-backend.onrender.com';

const C = {
  green:'#00c48c', greenDark:'#009a6e', greenBg:'#f0faf5',
  greenLight:'#e0f8ef', greenBorder:'#d6ede4',
  purple:'#6c63ff', red:'#ff6b6b',
  text:'#0d4d32', textMid:'#5a8070', textLight:'#a0b8b0',
  white:'#ffffff', inputBg:'#f2fbf7',
  amber:'#f59e0b', amberBg:'#fff8e1', amberBorder:'#ffe0a3',
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

function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2,'0')} ${period}`;
}

// Schedules a notification for the next occurrence of `timeStr` (HH:MM).
// If repeatDaily, reschedules itself for 24h later after firing.
function scheduleMedicineNotification(itemName, location, timeStr, repeatDaily) {
  const [hh, mm] = timeStr.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return;

  const now = new Date();
  let target = new Date();
  target.setHours(hh, mm, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target.getTime() - now.getTime();

  const fire = () => {
    if (Notification.permission === 'granted') {
      const n = new Notification('💊 Medicine Time!', {
        body: `Time to take "${itemName}" — kept in ${location}`,
        icon: '/logo192.png',
        tag: `keeep-med-${itemName}-${timeStr}`,
      });
      setTimeout(() => n.close(), 15000);
    }
    if (repeatDaily) {
      setTimeout(fire, 24 * 60 * 60 * 1000);
    }
  };

  setTimeout(fire, delay);
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
  const [reminderModalMode, setReminderModalMode] = useState('once'); // 'once' | 'medicine'
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [medicineTimes, setMedicineTimes] = useState(['08:00']);
  const [repeatDaily, setRepeatDaily] = useState(true);

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

    if (item.is_medicine) {
      setReminderModalMode('medicine');
      setMedicineTimes(item.reminder_times?.length > 0 ? [...item.reminder_times] : ['08:00']);
      setRepeatDaily(item.repeat_type === 'daily');
    } else {
      setReminderModalMode('once');
    }

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

  // medicine time slot helpers (for modal)
  const addMedicineTime = () => setMedicineTimes(prev => [...prev, '12:00']);
  const removeMedicineTime = (idx) => setMedicineTimes(prev => prev.filter((_, i) => i !== idx));
  const updateMedicineTime = (idx, value) => setMedicineTimes(prev => prev.map((t, i) => i === idx ? value : t));

  // ── NEW: save reminder ────────────────────────────────────
  async function handleReminderSave() {
    setSaving(true);
    try {
      const userId  = localStorage.getItem('user_id');
      const itemId  = reminderModal.id || reminderModal.doc_id;

      if (reminderModalMode === 'medicine') {
        const times = medicineTimes.filter(Boolean);
        if (times.length === 0) { setSaving(false); return; }
        const repeatType = repeatDaily ? 'daily' : '';

        await axios.patch(`${API}/items/${itemId}`, {
          text: reminderModal.item_name,
          user_id: userId,
          is_medicine: true,
          reminder_times: times,
          repeat_type: repeatType,
        });

        setItems(prev => prev.map(i => (i.id || i.doc_id) === itemId
          ? { ...i, is_medicine: true, reminder_times: times, repeat_type: repeatType }
          : i));

        // Schedule recurring notifications
        if ('Notification' in window && Notification.permission === 'granted') {
          times.forEach(t => scheduleMedicineNotification(reminderModal.item_name, reminderModal.location, t, repeatDaily));
        }
      } else {
        if (!newReminderDate || !newReminderTime) { setSaving(false); return; }
        const reminderISO = new Date(`${newReminderDate}T${newReminderTime}:00`).toISOString();

        await axios.patch(`${API}/items/${itemId}`, {
          text: reminderModal.item_name,
          user_id: userId,
          reminder_time: reminderISO,
        });

        setItems(prev => prev.map(i => (i.id || i.doc_id) === itemId ? { ...i, reminder_time: reminderISO } : i));

        // Schedule one-time browser notification
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
    const hasOnceReminder = item.reminder_time && item.reminder_time !== '';
    const reminderPast = hasOnceReminder && new Date(item.reminder_time) < new Date();
    const isMedicineWithTimes = item.is_medicine && item.reminder_times?.length > 0;
    const hasReminder = hasOnceReminder || isMedicineWithTimes;

    return (
      <div key={itemId || item.timestamp}
        style={{ background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'14px', padding: isMob ? '14px' : '16px', position:'relative' }}>

        {/* Reminder badge */}
        {hasReminder && (
          <div style={{ position:'absolute', top:'10px', right: isMob ? '70px' : '76px', background: isMedicineWithTimes ? C.amberBg : (reminderPast ? '#fff3e0' : C.greenLight), border:`1px solid ${isMedicineWithTimes ? '#ffe0a3' : (reminderPast ? '#ffb74d' : C.greenBorder)}`, borderRadius:'8px', padding:'2px 7px', fontSize:'10px', fontWeight:700, color: isMedicineWithTimes ? '#b45309' : (reminderPast ? '#e65100' : C.greenDark), display:'flex', alignItems:'center', gap:'3px' }}>
            {isMedicineWithTimes
              ? `💊 ${item.reminder_times.length}x daily`
              : `🔔 ${reminderPast ? 'Done' : formatReminderIST(item.reminder_time)}`}
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
          <div style={{ background:C.white, borderRadius:'20px', padding:'28px 24px', maxWidth:'400px', width:'100%', maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize:'18px', fontWeight:800, color:C.text, marginBottom:'4px' }}>🔔 Set Reminder</div>
            <div style={{ fontSize:'13px', color:C.textMid, marginBottom:'16px' }}>
              For: <strong>{reminderModal.item_name}</strong> in {reminderModal.location}
            </div>

            {/* Mode selector */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
              <button onClick={() => setReminderModalMode('once')}
                style={{ flex:1, padding:'9px', borderRadius:'10px', border: reminderModalMode==='once' ? `1.5px solid ${C.green}` : `1.5px solid ${C.greenBorder}`, background: reminderModalMode==='once' ? C.greenLight : C.white, color: reminderModalMode==='once' ? C.greenDark : C.textMid, fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                📦 One-time
              </button>
              <button onClick={() => setReminderModalMode('medicine')}
                style={{ flex:1, padding:'9px', borderRadius:'10px', border: reminderModalMode==='medicine' ? `1.5px solid ${C.amber}` : `1.5px solid ${C.greenBorder}`, background: reminderModalMode==='medicine' ? C.amberBg : C.white, color: reminderModalMode==='medicine' ? '#b45309' : C.textMid, fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                💊 Medicine
              </button>
            </div>

            {/* ONE-TIME mode */}
            {reminderModalMode === 'once' && (
              <div>
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
              </div>
            )}

            {/* MEDICINE mode */}
            {reminderModalMode === 'medicine' && (
              <div>
                <p style={{ fontSize:'12px', color:C.textMid, margin:'0 0 10px' }}>💊 Set times — we'll remind you every day</p>

                <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'10px' }}>
                  {medicineTimes.map((t, idx) => (
                    <div key={idx} style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <input type="time" value={t} onChange={e => updateMedicineTime(idx, e.target.value)}
                        style={{ flex:1, background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'8px', padding:'8px 10px', fontSize:'13px', color:C.text, outline:'none', boxSizing:'border-box' }} />
                      {medicineTimes.length > 1 && (
                        <button onClick={() => removeMedicineTime(idx)}
                          style={{ width:'34px', height:'34px', borderRadius:'8px', background:'#fff0f0', border:'1px solid #ffcccc', color:'#e53935', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Trash2 size={14}/>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={addMedicineTime}
                  style={{ display:'flex', alignItems:'center', gap:'6px', background:C.greenLight, border:`1.5px dashed ${C.green}`, borderRadius:'10px', padding:'8px 14px', fontSize:'13px', fontWeight:600, color:C.greenDark, cursor:'pointer', marginBottom:'12px' }}>
                  <Plus size={14}/> Add another time
                </button>

                {/* Repeat daily toggle */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:C.amberBg, border:`1px solid ${C.amberBorder}`, borderRadius:'10px', marginBottom:'12px' }}>
                  <span style={{ fontSize:'13px', fontWeight:600, color:'#92600a' }}>🔁 Repeat daily</span>
                  <div onClick={() => setRepeatDaily(p => !p)} style={{ width:'40px', height:'22px', borderRadius:'11px', background: repeatDaily ? C.amber : '#ccc', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                    <div style={{ position:'absolute', top:'2px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.25)', transition:'transform 0.2s', transform: repeatDaily ? 'translateX(20px)' : 'translateX(2px)' }} />
                  </div>
                </div>

                <p style={{ fontSize:'12px', color:C.textMid, margin:0, background:C.greenLight, padding:'8px 10px', borderRadius:'6px', border:`1px solid ${C.greenBorder}`, marginBottom:'16px' }}>
                  {repeatDaily ? '🔁 Every day at' : '⏰ Today at'}{' '}
                  <strong style={{ color:C.text }}>
                    {medicineTimes.filter(Boolean).map(formatTime12h).join(', ')}
                  </strong>
                </p>
              </div>
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