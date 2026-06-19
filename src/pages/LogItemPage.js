import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Camera, Mic, MicOff, Image, X, CheckCircle, Plus, Trash2 } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const C = {
  green:'#00c48c', greenDark:'#009a6e', greenBg:'#f0faf5',
  greenLight:'#e0f8ef', greenBorder:'#d6ede4',
  text:'#0d4d32', textMid:'#5a8070', textLight:'#a0b8b0',
  white:'#ffffff', inputBg:'#f2fbf7', red:'#ff6b6b',
  amber:'#f59e0b', amberBg:'#fff8e1', amberBorder:'#ffe0a3',
};

function stripMarkdown(t) {
  return t.replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')
          .replace(/`(.*?)`/g,'$1').replace(/#{1,6}\s/g,'')
          .replace(/\n{2,}/g,'\n').trim();
}


function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2,'0')} ${period}`;
}

async function requestNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

// ── One-time reminder notification ─────────────────────────────
function scheduleNotification(itemName, location, reminderISO) {
  const delay = new Date(reminderISO).getTime() - Date.now();
  if (delay <= 0) return;
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      const n = new Notification('⏰ Keeep Reminder', {
        body: `"${itemName}" is in ${location}. Time to use it!`,
        icon: '/logo192.png', tag: `keeep-${itemName}`,
      });
      setTimeout(() => n.close(), 10000);
    }
  }, delay);
}

// ── Recurring medicine notification ─────────────────────────────
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
      // reschedule for next day (24h later)
      setTimeout(fire, 24 * 60 * 60 * 1000);
    }
  };

  setTimeout(fire, delay);
}

// ── Photo compression ────────────────────────────────────────
function compressImage(base64) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
    };
    img.onerror = () => resolve(base64);
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

export default function LogItemPage() {
  const userId   = localStorage.getItem('user_id');
  const token    = localStorage.getItem('token');
  const email    = localStorage.getItem('email') || '';
  const username = email ? email.split('@')[0] : 'there';

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // form
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');

  // recently logged
  const [recentItems, setRecentItems] = useState([]);

  // photo
  const [photoData,    setPhotoData]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showCamera,   setShowCamera]   = useState(false);
  const [cameraError,  setCameraError]  = useState('');
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const fileInputRef = useRef(null);

  // voice
  const [isListening, setIsListening] = useState(false);
  const [voiceLang,   setVoiceLang]   = useState('en-IN');
  const recognitionRef = useRef(null);

  // reminder — general
  const [reminderEnabled,  setReminderEnabled]  = useState(false);
  const [reminderMode,     setReminderMode]     = useState('once'); // 'once' | 'medicine'
  const [notifPermission,  setNotifPermission]   = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  // reminder — one-time
  const [reminderDate, setReminderDate]     = useState('');
  const [reminderTime, setReminderTimeState] = useState('');

  // reminder — medicine (multiple times + daily repeat)
  const [medicineTimes, setMedicineTimes] = useState(['08:00']);
  const [repeatDaily,   setRepeatDaily]   = useState(true);

  // default date/time for "once" mode
  useEffect(() => {
    const now = new Date();
    setReminderDate(now.toISOString().split('T')[0]);
    now.setMinutes(now.getMinutes() + 5);
    setReminderTimeState(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
  }, []);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // fetch recent items — refetch when new item saved
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await axios.get(`${API}/my-items?user_id=${userId}`);
        setRecentItems((res.data.items || []).slice(0, 5));
      } catch {}
    };
    if (userId) fetchRecent();
  }, [result]); // eslint-disable-line

  // camera
  const openCamera = async () => {
    setCameraError(''); setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch { setCameraError('Camera not accessible.'); setShowCamera(false); }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const c = document.createElement('canvas');
    c.width = videoRef.current.videoWidth || 640;
    c.height = videoRef.current.videoHeight || 480;
    c.getContext('2d').drawImage(videoRef.current, 0, 0);
    const b64 = c.toDataURL('image/jpeg', 0.8).split(',')[1];
    setPhotoData(b64); setPhotoPreview(`data:image/jpeg;base64,${b64}`);
    closeCamera();
  }, []); // eslint-disable-line

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null; setShowCamera(false);
  }, []);

  const handleFileChoose = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => { const full = ev.target.result; setPhotoData(full.split(',')[1]); setPhotoPreview(full); };
    r.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoData(null); setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // upload with compression
  const uploadPhoto = async () => {
    if (!photoData) return null;
    try {
      const compressed = await compressImage(photoData);
      const sr = ref(storage, `items/${userId}/${Date.now()}.jpg`);
      await uploadString(sr, compressed, 'base64', { contentType:'image/jpeg' });
      return await getDownloadURL(sr);
    } catch { return null; }
  };

  // voice
  const toggleVoice = () => {
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Voice not supported in this browser.'); return; }
    const r = new SR();
    r.lang = voiceLang; r.continuous = false; r.interimResults = false;
    r.onresult = e => setDescription(p => p ? p+' '+e.results[0][0].transcript : e.results[0][0].transcript);
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    recognitionRef.current = r; r.start(); setIsListening(true);
  };

  // reminder toggle (master on/off)
  const handleReminderToggle = async () => {
    if (!reminderEnabled) {
      const granted = await requestNotifPermission();
      setNotifPermission(Notification.permission);
      if (!granted) { setError('Notification permission denied.'); return; }
    }
    setReminderEnabled(p => !p);
  };

  const buildReminderISO = () => {
    if (!reminderDate || !reminderTime) return null;
    return new Date(`${reminderDate}T${reminderTime}:00`).toISOString();
  };

  // medicine time slot helpers
  const addMedicineTime = () => {
    setMedicineTimes(prev => [...prev, '12:00']);
  };
  const removeMedicineTime = (idx) => {
    setMedicineTimes(prev => prev.filter((_, i) => i !== idx));
  };
  const updateMedicineTime = (idx, value) => {
    setMedicineTimes(prev => prev.map((t, i) => i === idx ? value : t));
  };

  // submit
  const handleSubmit = async () => {
    if (!description.trim()) { setError('Please describe the item and where you kept it.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const photoUrl = photoData ? await uploadPhoto() : null;

      // Build reminder payload based on mode
      let reminderISO = '';
      let isMedicine = false;
      let reminderTimes = [];
      let repeatType = '';

      if (reminderEnabled) {
        if (reminderMode === 'once') {
          reminderISO = buildReminderISO();
        } else {
          // medicine mode
          isMedicine = true;
          reminderTimes = medicineTimes.filter(t => t); // remove empty
          repeatType = repeatDaily ? 'daily' : '';
        }
      }

      const res = await fetch(`${API}/log-item`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          text: description.trim(),
          user_id: userId,
          photo_url: photoUrl || '',
          reminder_time: reminderISO || '',
          is_medicine: isMedicine,
          reminder_times: reminderTimes,
          repeat_type: repeatType,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        throw new Error(typeof e.detail==='string' ? e.detail : JSON.stringify(e.detail)||'Failed to save.');
      }
      const data = await res.json();
      const clean = { ...data, item_name:stripMarkdown(data.item_name||''), location:stripMarkdown(data.location||''), notes:data.notes?stripMarkdown(data.notes):'' };
      setResult(clean);

      // Schedule notifications
      if (reminderEnabled && clean.item_name) {
        if (reminderMode === 'once' && reminderISO) {
          scheduleNotification(clean.item_name, clean.location, reminderISO);
        } else if (reminderMode === 'medicine') {
          reminderTimes.forEach(t => scheduleMedicineNotification(clean.item_name, clean.location, t, repeatDaily));
        }
      }

      // reset form
      setDescription(''); setPhotoData(null); setPhotoPreview(null);
      setReminderEnabled(false); setReminderMode('once');
      setMedicineTimes(['08:00']); setRepeatDaily(true);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      alert('DEBUG ERROR: ' + (err?.message || 'unknown') + ' | Stack: ' + (err?.stack || 'none'));
    } finally { setLoading(false); }
  };

  const minDate  = new Date().toISOString().split('T')[0];
  const card     = { background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'14px', padding:'16px', marginBottom:'14px' };
  const sLabel   = { fontSize:'10px', fontWeight:700, color:C.textLight, letterSpacing:'1px', marginBottom:'10px', display:'block' };

 return (
    <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', minHeight:'100vh', fontFamily:"'Segoe UI',sans-serif" }}>

      {/* Camera Modal */}
      {showCamera && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#000', borderRadius:'12px', overflow:'hidden', width:'90%', maxWidth:'480px' }}>
            <video ref={videoRef} style={{ width:'100%', display:'block' }} playsInline autoPlay muted />
            <div style={{ display:'flex', gap:'10px', padding:'12px', justifyContent:'center' }}>
              <button onClick={capturePhoto} style={{ background:C.green, border:'none', borderRadius:'8px', padding:'10px 24px', color:'#fff', fontWeight:700, fontSize:'15px', cursor:'pointer' }}>📸 Capture</button>
              <button onClick={closeCamera}  style={{ background:C.red,   border:'none', borderRadius:'8px', padding:'10px 24px', color:'#fff', fontWeight:700, fontSize:'15px', cursor:'pointer' }}>✕ Cancel</button>
            </div>
            {cameraError && <p style={{ color:C.red, textAlign:'center', padding:'6px', fontSize:'12px' }}>{cameraError}</p>}
          </div>
        </div>
      )}

      {!isMobile && <Sidebar active="log" />}

      <div style={{ flex:1, background:C.greenBg, paddingBottom: isMobile ? '80px' : '40px', overflowY:'auto' }}>

        <div style={{ padding: isMobile ? '20px 16px 12px' : '28px 28px 16px' }}>
          <h2 style={{ margin:0, fontSize:'22px', fontWeight:700, color:C.text }}>Hey {username}! 👋</h2>
          <p style={{ margin:'4px 0 0', fontSize:'13px', color:C.textMid }}>Where did you keep something?</p>
        </div>

        <div style={{ padding: isMobile ? '0 16px' : '0 28px', display: isMobile ? 'block' : 'flex', gap:'20px', alignItems:'flex-start' }}>

          {/* Left column */}
          <div style={{ flex:1, maxWidth: isMobile ? '100%' : '520px' }}>

            {/* Describe */}
            <div style={card}>
              <span style={sLabel}>DESCRIBE IT</span>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder={voiceLang==='hi-IN' ? 'जैसे: मैंने पासपोर्ट बेडरूम की दराज में रखा है...' : 'e.g. I kept my passport in the blue drawer in the bedroom...'}
                rows={3}
                style={{ width:'100%', background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'10px', padding:'10px 12px', fontSize:'14px', color:C.text, resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:'10px' }}
              />
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                <button onClick={toggleVoice} style={{ display:'flex', alignItems:'center', gap:'6px', background: isListening ? C.red : C.green, border:'none', borderRadius:'20px', padding:'7px 16px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
                  {isListening ? <MicOff size={14}/> : <Mic size={14}/>}
                  {isListening ? 'Listening…' : (voiceLang==='hi-IN' ? 'बोलें' : 'English')}
                </button>
                <button onClick={() => setVoiceLang(p => p==='en-IN' ? 'hi-IN' : 'en-IN')}
                  style={{ background:C.greenLight, border:`1.5px solid ${C.greenBorder}`, borderRadius:'20px', padding:'7px 14px', fontSize:'13px', fontWeight:600, cursor:'pointer', color:C.text }}>
                  {voiceLang==='hi-IN' ? '🇮🇳 Hindi' : 'IN Hindi'}
                </button>
              </div>
            </div>

            {/* Photo */}
            <div style={card}>
              <span style={sLabel}>📷 ADD PHOTO (OPTIONAL)</span>
              {photoPreview ? (
                <div>
                  <img src={photoPreview} alt="preview" style={{ width:'100%', maxHeight:'200px', objectFit:'cover', borderRadius:'10px', border:`1.5px solid ${C.greenBorder}` }} />
                  <button onClick={removePhoto} style={{ display:'flex', alignItems:'center', gap:'4px', marginTop:'8px', background:'#fff0f0', border:'1.5px solid #ffcccc', borderRadius:'6px', padding:'5px 10px', fontSize:'12px', fontWeight:600, color:C.red, cursor:'pointer' }}>
                    <X size={14}/> Remove
                  </button>
                </div>
              ) : (
                <div style={{ display:'flex', gap:'10px' }}>
                  <button onClick={openCamera} style={{ display:'flex', alignItems:'center', gap:'6px', flex:1, justifyContent:'center', background:C.greenLight, border:`1.5px solid ${C.green}`, borderRadius:'10px', padding:'10px', fontSize:'13px', fontWeight:600, color:C.greenDark, cursor:'pointer' }}>
                    <Camera size={14}/> Take photo
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:'6px', flex:1, justifyContent:'center', background:C.greenLight, border:`1.5px solid ${C.green}`, borderRadius:'10px', padding:'10px', fontSize:'13px', fontWeight:600, color:C.greenDark, cursor:'pointer' }}>
                    <Image size={14}/> Choose photo
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileChoose} />
                </div>
              )}
            </div>

            {/* ── Reminder card ── */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: reminderEnabled ? '12px' : 0 }}>
                <span style={{ ...sLabel, marginBottom:0 }}>🔔 SET A REMINDER</span>
                <div onClick={handleReminderToggle} style={{ width:'46px', height:'26px', borderRadius:'13px', background: reminderEnabled ? C.green : '#ccc', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:'3px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.25)', transition:'transform 0.2s', transform: reminderEnabled ? 'translateX(22px)' : 'translateX(2px)' }} />
                </div>
              </div>

              {reminderEnabled && (
                <div>
                  {/* Mode selector */}
                  <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
                    <button onClick={() => setReminderMode('once')}
                      style={{ flex:1, padding:'9px', borderRadius:'10px', border: reminderMode==='once' ? `1.5px solid ${C.green}` : `1.5px solid ${C.greenBorder}`, background: reminderMode==='once' ? C.greenLight : C.white, color: reminderMode==='once' ? C.greenDark : C.textMid, fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                      📦 One-time
                    </button>
                    <button onClick={() => setReminderMode('medicine')}
                      style={{ flex:1, padding:'9px', borderRadius:'10px', border: reminderMode==='medicine' ? `1.5px solid ${C.amber}` : `1.5px solid ${C.greenBorder}`, background: reminderMode==='medicine' ? C.amberBg : C.white, color: reminderMode==='medicine' ? '#b45309' : C.textMid, fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                      💊 Medicine
                    </button>
                  </div>

                  {/* ONE-TIME mode */}
                  {reminderMode === 'once' && (
                    <div>
                      <p style={{ fontSize:'12px', color:C.textMid, margin:'0 0 10px' }}>📱 We'll notify you at this time (IST)</p>
                      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'8px' }}>
                        <div style={{ flex:1, minWidth:'120px' }}>
                          <div style={{ fontSize:'11px', fontWeight:600, color:C.textLight, marginBottom:'4px' }}>📅 Date</div>
                          <input type="date" min={minDate} value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                            style={{ width:'100%', background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'8px', padding:'8px 10px', fontSize:'13px', color:C.text, outline:'none', boxSizing:'border-box' }} />
                        </div>
                        <div style={{ flex:1, minWidth:'120px' }}>
                          <div style={{ fontSize:'11px', fontWeight:600, color:C.textLight, marginBottom:'4px' }}>⏰ Time</div>
                          <input type="time" value={reminderTime} onChange={e => setReminderTimeState(e.target.value)}
                            style={{ width:'100%', background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'8px', padding:'8px 10px', fontSize:'13px', color:C.text, outline:'none', boxSizing:'border-box' }} />
                        </div>
                      </div>
                      {reminderDate && reminderTime && (
                        <p style={{ fontSize:'12px', color:C.textMid, margin:0, background:C.greenLight, padding:'8px 10px', borderRadius:'6px', border:`1px solid ${C.greenBorder}` }}>
                          Will remind on <strong style={{ color:C.text }}>{new Date(`${reminderDate}T${reminderTime}`).toLocaleString('en-IN',{ day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {/* MEDICINE mode */}
                  {reminderMode === 'medicine' && (
                    <div>
                      <p style={{ fontSize:'12px', color:C.textMid, margin:'0 0 10px' }}>💊 Set times — we'll remind you every day</p>

                      <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'10px' }}>
                        {medicineTimes.map((t, idx) => (
                          <div key={idx} style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                            <input type="time" value={t} onChange={e => updateMedicineTime(idx, e.target.value)}
                              style={{ flex:1, background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'8px', padding:'8px 10px', fontSize:'13px', color:C.text, outline:'none', boxSizing:'border-box' }} />
                            {medicineTimes.length > 1 && (
                              <button onClick={() => removeMedicineTime(idx)}
                                style={{ width:'34px', height:'34px', borderRadius:'8px', background:'#fff0f0', border:'1px solid #ffcccc', color:C.red, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
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
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:C.amberBg, border:`1px solid ${C.amberBorder}`, borderRadius:'10px', marginBottom:'10px' }}>
                        <span style={{ fontSize:'13px', fontWeight:600, color:'#92600a' }}>🔁 Repeat daily</span>
                        <div onClick={() => setRepeatDaily(p => !p)} style={{ width:'40px', height:'22px', borderRadius:'11px', background: repeatDaily ? C.amber : '#ccc', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                          <div style={{ position:'absolute', top:'2px', width:'18px', height:'18px', borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.25)', transition:'transform 0.2s', transform: repeatDaily ? 'translateX(20px)' : 'translateX(2px)' }} />
                        </div>
                      </div>

                      {/* Preview */}
                      <p style={{ fontSize:'12px', color:C.textMid, margin:0, background:C.greenLight, padding:'8px 10px', borderRadius:'6px', border:`1px solid ${C.greenBorder}` }}>
                        {repeatDaily ? '🔁 Every day at' : '⏰ Today at'}{' '}
                        <strong style={{ color:C.text }}>
                          {medicineTimes.filter(Boolean).map(formatTime12h).join(', ')}
                        </strong>
                      </p>
                    </div>
                  )}

                  {notifPermission==='denied' && (
                    <p style={{ background:'#fff8e1', border:'1px solid #ffd54f', borderRadius:'6px', padding:'8px', fontSize:'12px', color:'#795548', margin:'8px 0 0' }}>
                      ⚠️ Notifications blocked. Enable in browser → Site Settings → Notifications.
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && <div style={{ background:'#fff0f0', border:`1.5px solid ${C.red}`, borderRadius:'10px', padding:'12px 14px', fontSize:'13px', color:'#c62828', marginBottom:'14px' }}>⚠️ {error}</div>}

            {result && (
              <div style={{ background:C.greenLight, border:`1.5px solid ${C.green}`, borderRadius:'14px', padding:'16px', marginBottom:'14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                  <CheckCircle size={18} color={C.green} />
                  <span style={{ fontWeight:700, fontSize:'14px', color:C.greenDark }}>Item Logged! ✅</span>
                </div>
                {[['Item',result.item_name],['Location',result.location],['Notes',result.notes]].map(([k,v]) =>
                  v ? <div key={k} style={{ display:'flex', gap:'8px', fontSize:'13px', marginBottom:'5px' }}>
                    <span style={{ fontWeight:600, color:C.textMid, minWidth:'65px' }}>{k}:</span>
                    <span style={{ color:C.text }}>{v}</span>
                  </div> : null
                )}
                {result.photo_url && <img src={result.photo_url} alt="item" style={{ width:'100%', maxHeight:'160px', objectFit:'cover', borderRadius:'8px', marginTop:'8px' }} />}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{ width:'100%', background: loading ? C.textLight : C.green, border:'none', borderRadius:'12px', padding:'14px', color:'#fff', fontSize:'15px', fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom:'8px' }}>
              {loading ? '⏳ Saving…' : '📍 Save to Keeep'}
            </button>
          </div>

          {/* Right column — Recently Logged */}
          {!isMobile && (
            <div style={{ width:'280px', flexShrink:0 }}>
              <div style={{ background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'14px', padding:'16px' }}>
                <span style={sLabel}>RECENTLY LOGGED</span>
                {recentItems.length === 0 ? (
                  <p style={{ fontSize:'13px', color:C.textLight, margin:0, textAlign:'center', padding:'20px 0' }}>No items yet</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {recentItems.map((item, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px', background:C.greenBg, borderRadius:'10px', border:`1px solid ${C.greenBorder}`, position:'relative' }}>
                        <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:C.greenLight, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
                          {item.photo_url
                            ? <img src={item.photo_url} alt="" style={{ width:'36px', height:'36px', objectFit:'cover' }} />
                            : <span style={{ fontSize:'18px' }}>{item.is_medicine ? '💊' : '📦'}</span>}
                        </div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <div style={{ fontSize:'13px', fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {item.item_name || 'Item'}
                          </div>
                          <div style={{ fontSize:'11px', color:C.textMid, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            📍 {item.location || ''}
                          </div>
                          <div style={{ fontSize:'10px', color:C.textLight }}>
                            {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-IN', { timeZone:'Asia/Kolkata' }) : ''}
                          </div>
                        </div>
                        {item.is_medicine && item.reminder_times?.length > 0 && (
                          <div style={{ fontSize:'9px', fontWeight:700, color:'#b45309', background:C.amberBg, border:`1px solid ${C.amberBorder}`, borderRadius:'6px', padding:'2px 5px', whiteSpace:'nowrap', flexShrink:0 }}>
                            🔁 {item.reminder_times.length}x
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile && <BottomNav active="log" />}
    </div>
  );
}