import { useState, useEffect, useRef } from 'react';
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

function LogItemPage() {
  const navigate                        = useNavigate();
  const { email }                       = useSession();
  const [text, setText]                 = useState('');
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState('');
  const [error, setError]               = useState('');
  const [listening, setListening]       = useState(false);
  const [recent, setRecent]             = useState([]);
  const [isMobile, setIsMobile]         = useState(window.innerWidth < 768);
  const [photo, setPhoto]               = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef                    = useRef(null);
  const cameraInputRef                  = useRef(null);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    fetchRecent();
    return () => window.removeEventListener('resize', h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchRecent() {
    try {
      const userId = localStorage.getItem('user_id');
      const res = await axios.get(`${API}/my-items?user_id=${userId}`);
      setRecent((res.data.items || []).slice(0, 3));
    } catch (_) {}
  }

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target.result);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhoto(null);
    setPhotoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  async function handleSave() {
    if (!text.trim()) { setError('Please describe what you kept and where'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const userId = localStorage.getItem('user_id');
      let photoUrl = '';

      // upload photo first if exists
      if (photo) {
        setUploadingPhoto(true);
        try {
          const uploadRes = await axios.post(API + '/upload-photo', {
            photo_base64: photo,
            user_id: userId,
          });
          photoUrl = uploadRes.data.photo_url;
          console.log('✅ Photo uploaded:', photoUrl);
        } catch (err) {
          console.log('❌ Photo upload error:', err.response?.data);
        }
        setUploadingPhoto(false);
      }

      console.log('📍 Saving with photo_url:', photoUrl);

      await axios.post(API + '/log-item', {
        text,
        user_id: userId,
        photo_url: photoUrl,
      });

      setSuccess('✅ Item saved successfully!');
      setText('');
      removePhoto();
      fetchRecent();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      if (err.response?.status === 401) { logout(navigate); return; }
      setError(err.response?.data?.detail || 'Failed to save. Try again.');
    }
    setLoading(false);
    setUploadingPhoto(false);
  }

  function handleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Voice not supported in this browser'); return; }
    const rec = new SR();
    rec.lang = 'hi-IN';
    rec.interimResults = false;
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onresult = (e) => setText(e.results[0][0].transcript);
    rec.onerror  = () => { setListening(false); setError('Voice error. Try again.'); };
    rec.start();
  }

  const username = (email || '').split('@')[0] || 'there';

  // ── PHOTO SECTION ─────────────────────────────────────────
  const photoSection = (
    <div style={{ marginTop:'10px' }}>
      <input ref={cameraInputRef} type="file" accept="image/*"
        capture="environment" style={{ display:'none' }}
        onChange={handlePhotoSelect} />
      <input ref={fileInputRef} type="file" accept="image/*"
        style={{ display:'none' }} onChange={handlePhotoSelect} />

      {photoPreview ? (
        <div style={{ position:'relative', marginTop:'8px' }}>
          <img src={photoPreview} alt="Item location"
            style={{ width:'100%', height:'160px', objectFit:'cover', borderRadius:'12px', border:`1.5px solid ${C.greenBorder}` }} />
          <button onClick={removePhoto}
            style={{ position:'absolute', top:'8px', right:'8px', width:'28px', height:'28px', borderRadius:'50%', background:'rgba(0,0,0,0.6)', border:'none', color:'#fff', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ✕
          </button>
          <div style={{ position:'absolute', bottom:'8px', left:'8px', background:'rgba(0,196,140,0.9)', borderRadius:'8px', padding:'3px 8px', fontSize:'11px', color:'#fff', fontWeight:600 }}>
            📸 Photo added
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={() => cameraInputRef.current?.click()}
            style={{ flex:1, padding:'10px', background:C.greenBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'12px', fontWeight:600, color:C.text, display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', cursor:'pointer', fontFamily:'inherit' }}>
            📸 Take photo
          </button>
          <button onClick={() => fileInputRef.current?.click()}
            style={{ flex:1, padding:'10px', background:C.greenBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'12px', fontWeight:600, color:C.text, display:'flex', alignItems:'center', justifyContent:'center', gap:'5px', cursor:'pointer', fontFamily:'inherit' }}>
            🖼️ Choose photo
          </button>
        </div>
      )}
    </div>
  );

  // ── RECENT ITEM ───────────────────────────────────────────
  const renderRecentItem = (item, i) => (
    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px', border:`1px solid ${C.greenBorder}`, borderRadius:'10px', marginBottom:'8px', background:C.greenBg }}>
      {item.photo_url ? (
        <img src={item.photo_url} alt={item.item_name}
          style={{ width:'40px', height:'40px', borderRadius:'9px', objectFit:'cover', flexShrink:0 }} />
      ) : (
        <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:C.greenLight, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0 }}>📦</div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'13px', fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {item.item_name || item.text?.substring(0,30) || 'Item'}
        </div>
        <div style={{ fontSize:'11px', color:C.textMid, marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {item.location || item.text?.substring(0,50)}
        </div>
        <div style={{ fontSize:'10px', color:C.textLight, marginTop:'2px' }}>
          {item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-IN') : 'Just now'}
        </div>
      </div>
    </div>
  );

  // ── LOG FORM ──────────────────────────────────────────────
  const logForm = (
    <div style={{ background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'16px', padding:'20px', marginBottom:'16px' }}>
      <div style={{ fontSize:'13px', fontWeight:700, color:C.textMid, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'12px' }}>
        Describe it
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="e.g. I kept my passport in the blue drawer in the bedroom..."
        style={{ width:'100%', padding:'12px', background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'14px', color:'#1a1a1a', resize:'none', outline:'none', height:'90px', boxSizing:'border-box', fontFamily:'inherit', cursor:'text' }} />

      <button onClick={handleVoice}
        style={{ width:'100%', padding:'11px', marginTop:'8px', background: listening ? '#eeecfe' : '#f0eefe', border:`1.5px solid ${listening ? C.purple : '#c8c3f5'}`, borderRadius:'12px', fontSize:'13px', fontWeight:600, color:C.purple, display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', cursor:'pointer', fontFamily:'inherit' }}>
        {listening ? '🔴 Listening...' : '🎤 Tap to speak (Hindi / English)'}
      </button>

      {photoSection}

      {error   && <div style={{ background:'#fff5f5', border:'1px solid #ffcdd2', borderRadius:'10px', padding:'10px', color:'#e53935', fontSize:'12px', marginTop:'10px' }}>{error}</div>}
      {success && <div style={{ background:C.greenLight, border:`1px solid ${C.greenBorder}`, borderRadius:'10px', padding:'10px', color:C.text, fontSize:'12px', marginTop:'10px' }}>{success}</div>}

      <button onClick={handleSave} disabled={loading}
        style={{ width:'100%', padding:'14px', marginTop:'12px', background: loading ? C.greenDark : C.green, color:C.white, border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>
        {uploadingPhoto ? '📸 Uploading photo...' : loading ? '⏳ Saving...' : '📍 Save to Keeep'}
      </button>
    </div>
  );

  // ── RECENT CARD ───────────────────────────────────────────
  const recentCard = (
    <div style={{ background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'16px', padding:'20px' }}>
      <div style={{ fontSize:'13px', fontWeight:700, color:C.textMid, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'12px' }}>
        Recently logged
      </div>
      {recent.length === 0 ? (
        <div style={{ textAlign:'center', padding:'24px 0', color:C.textLight, fontSize:'13px' }}>
          No items yet. Log your first item! 👆
        </div>
      ) : recent.map((item, i) => renderRecentItem(item, i))}
    </div>
  );

  return (
    <>
      <style>{`
        textarea:focus { border-color: #00c48c !important; background: #fff !important; outline: none !important; }
        button:active { opacity: 0.9; }
      `}</style>

      <div style={{ minHeight:'100vh', background:C.greenBg, display:'flex', flexDirection:'column', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ height:'3px', background:'linear-gradient(90deg,#00d09c,#6c63ff,#ff6b6b)', flexShrink:0 }} />

        {isMobile ? (
          <>
            <div style={{ background:C.white, borderBottom:`1px solid ${C.greenBorder}`, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'18px', fontWeight:800, color:C.text }}>
                K<span style={{color:C.green}}>e</span><span style={{color:C.purple}}>e</span><span style={{color:C.red}}>e</span>p
              </span>
              <button onClick={() => logout(navigate)} style={{ padding:'6px 12px', background:'#fff5f5', border:'1px solid #ffcdd2', borderRadius:'8px', color:'#e53935', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Logout
              </button>
            </div>
            <div style={{ flex:1, padding:'16px', overflowY:'auto' }}>
              <div style={{ marginBottom:'20px' }}>
                <h1 style={{ fontSize:'20px', fontWeight:800, color:C.text }}>Hey {username}! 👋</h1>
                <p style={{ fontSize:'13px', color:C.textMid, marginTop:'3px' }}>Where did you keep something?</p>
              </div>
              {logForm}
              {recentCard}
            </div>
            <BottomNav active="log" />
          </>
        ) : (
          <div style={{ display:'flex', flex:1 }}>
            <Sidebar active="log" />
            <div style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
              <div style={{ marginBottom:'24px' }}>
                <h1 style={{ fontSize:'24px', fontWeight:800, color:C.text }}>Hey {username}! 👋</h1>
                <p style={{ fontSize:'13px', color:C.textMid, marginTop:'3px' }}>Where did you keep something?</p>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
                {logForm}
                {recentCard}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default LogItemPage;