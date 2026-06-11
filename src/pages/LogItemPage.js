import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Camera, Mic, MicOff, Image, X, CheckCircle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const C = {
  green:'#00c48c', greenDark:'#009a6e', greenBg:'#f0faf5',
  greenLight:'#e0f8ef', greenBorder:'#d6ede4',
  text:'#0d4d32', textMid:'#5a8070', textLight:'#a0b8b0',
  white:'#ffffff', inputBg:'#f2fbf7', red:'#ff6b6b',
};

function stripMarkdown(t) {
  return t.replace(/\*\*(.*?)\*\*/g,'$1').replace(/\*(.*?)\*/g,'$1')
          .replace(/`(.*?)`/g,'$1').replace(/#{1,6}\s/g,'')
          .replace(/\n{2,}/g,'\n').trim();
}

function formatIST(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    timeZone:'Asia/Kolkata', day:'2-digit', month:'short',
    year:'numeric', hour:'2-digit', minute:'2-digit',
  });
}

async function requestNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

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

export default function LogItemPage() {
  const navigate = useNavigate();
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

  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');

  const [photoData,    setPhotoData]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showCamera,   setShowCamera]   = useState(false);
  const [cameraError,  setCameraError]  = useState('');
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const fileInputRef = useRef(null);

  // FIX 1: voice state — same as before
  const [isListening, setIsListening] = useState(false);
  const [voiceLang,   setVoiceLang]   = useState('en-IN');
  const recognitionRef = useRef(null);

  const [reminderEnabled,  setReminderEnabled]  = useState(false);
  const [reminderDate,     setReminderDate]      = useState('');
  const [reminderTime,     setReminderTimeState] = useState('');
  const [notifPermission,  setNotifPermission]   = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  // FIX 2: default date = TODAY (not tomorrow)
  useEffect(() => {
    const now = new Date();
    setReminderDate(now.toISOString().split('T')[0]); // today
    // FIX 3: default time = current time + 5 minutes
    now.setMinutes(now.getMinutes() + 5);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setReminderTimeState(`${hh}:${mm}`);
  }, []);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

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

  const uploadPhoto = async () => {
    if (!photoData) return null;
    try {
      const sr = ref(storage, `items/${userId}/${Date.now()}.jpg`);
      await uploadString(sr, photoData, 'base64', { contentType:'image/jpeg' });
      return await getDownloadURL(sr);
    } catch { return null; }
  };

  // FIX 4: voice toggle — works correctly
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Voice not supported in this browser.'); return; }
    const r = new SR();
    r.lang = voiceLang;
    r.continuous = false;
    r.interimResults = false;
    r.onresult = e => {
      const transcript = e.results[0][0].transcript;
      setDescription(p => p ? p + ' ' + transcript : transcript);
    };
    r.onend   = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  };

  const handleReminderToggle = async () => {
    if (!reminderEnabled) {
      const granted = await requestNotifPermission();
      setNotifPermission(Notification.permission);
      if (!granted) { setError('Notification permission denied.'); return; }
    }
    setReminderEnabled(p => !p);
  };

  // ✅ Fixed — let browser handle timezone
const buildReminderISO = () => {
  if (!reminderDate || !reminderTime) return null;
  return new Date(`${reminderDate}T${reminderTime}:00`).toISOString();
};

  const handleSubmit = async () => {
    if (!description.trim()) { setError('Please describe the item and where you kept it.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const photoUrl    = photoData ? await uploadPhoto() : null;
      const reminderISO = reminderEnabled ? buildReminderISO() : null;
      const res = await fetch(`${API}/log-item`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          text: description.trim(),
          user_id: userId,
          photo_url: photoUrl || '',
          reminder_time: reminderISO || '',
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        throw new Error(typeof e.detail==='string' ? e.detail : JSON.stringify(e.detail)||'Failed to save.');
      }
      const data = await res.json();
      const clean = {
        ...data,
        item_name: stripMarkdown(data.item_name||''),
        location:  stripMarkdown(data.location||''),
        notes:     data.notes ? stripMarkdown(data.notes) : '',
      };
      setResult(clean);

      // FIX 5: schedule notification using reminderISO from frontend
      // (don't rely on backend response reminder_time)
      if (reminderEnabled && reminderISO && clean.item_name) {
        scheduleNotification(clean.item_name, clean.location, reminderISO);
      }

      setDescription(''); setPhotoData(null); setPhotoPreview(null); setReminderEnabled(false);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const minDate = new Date().toISOString().split('T')[0];
  const card   = { background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'14px', padding:'16px', marginBottom:'14px' };
  const sLabel = { fontSize:'10px', fontWeight:700, color:C.textLight, letterSpacing:'1px', marginBottom:'10px', display:'block' };

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:"'Segoe UI',sans-serif" }}>

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

          <div style={{ flex:1, maxWidth: isMobile ? '100%' : '520px' }}>

            {/* Describe it */}
            <div style={card}>
              <span style={sLabel}>DESCRIBE IT</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={voiceLang==='hi-IN' ? 'जैसे: मैंने पासपोर्ट बेडरूम की दराज में रखा है...' : 'e.g. I kept my passport in the blue drawer in the bedroom...'}
                rows={3}
                style={{ width:'100%', background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'10px', padding:'10px 12px', fontSize:'14px', color:C.text, resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:'10px' }}
              />
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {/* Voice button */}
                <button
                  onClick={toggleVoice}
                  style={{ display:'flex', alignItems:'center', gap:'6px', background: isListening ? C.red : C.green, border:'none', borderRadius:'20px', padding:'7px 16px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer' }}
                >
                  {isListening ? <MicOff size={14}/> : <Mic size={14}/>}
                  {isListening ? 'Listening…' : (voiceLang==='hi-IN' ? 'बोलें' : 'English')}
                </button>
                {/* Lang toggle */}
                <button
                  onClick={() => setVoiceLang(p => p==='en-IN' ? 'hi-IN' : 'en-IN')}
                  style={{ background:C.greenLight, border:`1.5px solid ${C.greenBorder}`, borderRadius:'20px', padding:'7px 14px', fontSize:'13px', fontWeight:600, cursor:'pointer', color:C.text }}
                >
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

            {/* Reminder */}
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: reminderEnabled ? '12px' : 0 }}>
                <span style={{ ...sLabel, marginBottom:0 }}>🔔 SET A REMINDER</span>
                <div onClick={handleReminderToggle} style={{ width:'46px', height:'26px', borderRadius:'13px', background: reminderEnabled ? C.green : '#ccc', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:'3px', width:'20px', height:'20px', borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.25)', transition:'transform 0.2s', transform: reminderEnabled ? 'translateX(22px)' : 'translateX(2px)' }} />
                </div>
              </div>
              {reminderEnabled && (
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
                  {notifPermission==='denied' && (
                    <p style={{ background:'#fff8e1', border:'1px solid #ffd54f', borderRadius:'6px', padding:'8px', fontSize:'12px', color:'#795548', margin:'0 0 8px' }}>
                      ⚠️ Notifications blocked. Enable in browser → Site Settings → Notifications.
                    </p>
                  )}
                  {reminderDate && reminderTime && (
                    <p style={{ fontSize:'12px', color:C.textMid, margin:0, background:C.greenLight, padding:'8px 10px', borderRadius:'6px', border:`1px solid ${C.greenBorder}` }}>
                      Will remind on <strong style={{ color:C.text }}>{new Date(`${reminderDate}T${reminderTime}`).toLocaleString('en-IN',{ day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div style={{ background:'#fff0f0', border:`1.5px solid ${C.red}`, borderRadius:'10px', padding:'12px 14px', fontSize:'13px', color:'#c62828', marginBottom:'14px' }}>
                ⚠️ {error}
              </div>
            )}

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

          {!isMobile && (
            <div style={{ width:'280px', flexShrink:0 }}>
              <div style={{ background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'14px', padding:'16px' }}>
                <span style={sLabel}>RECENTLY LOGGED</span>
                <p style={{ fontSize:'13px', color:C.textLight, margin:0, textAlign:'center', padding:'20px 0' }}>
                  Your recent items will appear here
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {isMobile && <BottomNav />}
    </div>
  );
}