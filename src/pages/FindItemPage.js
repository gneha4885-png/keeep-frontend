import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSession, logout } from '../hooks/useSession';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import { Mic, MicOff } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://keeep-backend.onrender.com';

const C = {
  green:'#00c48c', greenDark:'#009a6e', greenBg:'#f0faf5',
  greenLight:'#e0f8ef', greenBorder:'#d6ede4',
  purple:'#6c63ff', red:'#ff6b6b',
  text:'#0d4d32', textMid:'#5a8070', textLight:'#a0b8b0',
  white:'#ffffff', inputBg:'#f2fbf7',
};

const QUICK_CHIPS = ['Keys 🔑', 'Passport 📘', 'Wallet 👛', 'Charger 🔌', 'Documents 📄', 'Remote 📺'];

function FindItemPage() {
  const navigate              = useNavigate();
  useSession();
  const [query, setQuery]     = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ── Voice state ──────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [voiceLang,   setVoiceLang]   = useState('en-IN');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  async function handleSearch(q) {
    const searchQuery = q || query;
    if (!searchQuery.trim()) { setError('Please enter what you are looking for'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const userId = localStorage.getItem('user_id');
      const res = await axios.get(`${API}/find-item`, {
        params: { query: searchQuery, user_id: userId },
      });
      setResult(res.data);
    } catch (err) {
      if (err.response?.status === 401) { logout(navigate); return; }
      setError(err.response?.data?.detail || 'Nothing found. Try a different search.');
    }
    setLoading(false);
  }

  // ── Voice toggle ─────────────────────────────────────────────
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
    r.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      // Auto search after voice input
      handleSearch(transcript);
    };
    r.onend   = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  };

  // ── Search card ───────────────────────────────────────────────
  const searchCard = (
    <div style={{ background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'16px', padding:'20px', marginBottom:'16px' }}>
      {/* Input row */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'10px' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Where are my car keys? / मेरा पासपोर्ट कहाँ है?"
          style={{ flex:1, padding:'13px 14px', background:C.inputBg, border:`1.5px solid ${C.greenBorder}`, borderRadius:'12px', fontSize:'14px', color:'#1a1a1a', outline:'none', cursor:'text', fontFamily:'inherit' }}
        />
        <button onClick={() => handleSearch()} disabled={loading}
          style={{ padding:'13px 20px', background:C.green, color:C.white, border:'none', borderRadius:'12px', fontSize:'14px', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit' }}>
          {loading ? '⏳' : 'Search AI'}
        </button>
      </div>

      {/* Voice row */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'14px' }}>
        <button
          onClick={toggleVoice}
          style={{ display:'flex', alignItems:'center', gap:'6px', background: isListening ? C.red : C.green, border:'none', borderRadius:'20px', padding:'7px 16px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer' }}
        >
          {isListening ? <MicOff size={14}/> : <Mic size={14}/>}
          {isListening ? 'Listening…' : (voiceLang === 'hi-IN' ? 'बोलें' : 'English')}
        </button>
        <button
          onClick={() => setVoiceLang(p => p === 'en-IN' ? 'hi-IN' : 'en-IN')}
          style={{ background:C.greenLight, border:`1.5px solid ${C.greenBorder}`, borderRadius:'20px', padding:'7px 14px', fontSize:'13px', fontWeight:600, cursor:'pointer', color:C.text }}
        >
          {voiceLang === 'hi-IN' ? '🇮🇳 Hindi' : 'IN Hindi'}
        </button>
        {isListening && (
          <span style={{ fontSize:'12px', color:C.green, alignSelf:'center', animation:'pulse 1s infinite' }}>
            🎤 Listening...
          </span>
        )}
      </div>

      {/* Quick chips */}
      <div style={{ fontSize:'11px', fontWeight:700, color:C.textLight, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>Quick search</div>
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        {QUICK_CHIPS.map(chip => (
          <button key={chip}
            onClick={() => { const q = chip.split(' ')[0]; setQuery(q); handleSearch(q); }}
            style={{ padding:'6px 12px', borderRadius:'12px', fontSize:'12px', fontWeight:600, cursor:'pointer', border:`1px solid ${C.greenBorder}`, background:C.greenBg, color:C.textMid, fontFamily:'inherit' }}>
            {chip}
          </button>
        ))}
      </div>
    </div>
  );

  const resultCard = result && (
    <div style={{ background:C.greenBg, border:`1.5px solid ${C.green}33`, borderRadius:'16px', padding:'20px', boxShadow:`0 4px 20px ${C.green}15` }}>
      <div style={{ fontSize:'11px', fontWeight:700, color:C.green, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:'10px' }}>✅ AI found this</div>
      <div style={{ fontSize:'20px', fontWeight:800, color:C.text, marginBottom:'6px' }}>
        {result.item_name || query || 'Item found!'}
      </div>
      <div style={{ fontSize:'15px', color:C.textMid, marginBottom:'6px', lineHeight:1.5 }}>📍 {result.location || result.answer}</div>
      {result.timestamp && <div style={{ fontSize:'12px', color:C.textLight }}>🕐 Logged on {new Date(result.timestamp).toLocaleString('en-IN')}</div>}
      <div style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'#eeecfe', borderRadius:'8px', padding:'4px 10px', fontSize:'11px', fontWeight:600, color:C.purple, marginTop:'12px' }}>
        ✨ Answered by Claude AI
      </div>
    </div>
  );

  const errorCard = error && (
    <div style={{ background:'#fff5f5', border:'1px solid #ffcdd2', borderRadius:'12px', padding:'14px 16px', color:'#e53935', fontSize:'13px', marginBottom:'16px' }}>
      {error}
    </div>
  );

  const loadingCard = loading && (
    <div style={{ background:C.white, border:`1px solid ${C.greenBorder}`, borderRadius:'16px', padding:'24px', textAlign:'center', color:C.textMid, fontSize:'14px' }}>
      🤖 Claude is searching your items...
    </div>
  );

  return (
    <>
      <style>{`
        input:focus { border-color: #00c48c !important; background: #fff !important; outline: none !important; }
        button:hover { opacity: 0.9; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <div style={{ minHeight:'100vh', background:C.greenBg, display:'flex', flexDirection:'column', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ height:'3px', background:'linear-gradient(90deg,#00d09c,#6c63ff,#ff6b6b)', flexShrink:0 }} />

        {isMobile ? (
          <>
            <div style={{ background:C.white, borderBottom:`1px solid ${C.greenBorder}`, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'18px', fontWeight:800, color:C.text }}>
                K<span style={{color:C.green}}>e</span><span style={{color:C.purple}}>e</span><span style={{color:C.red}}>e</span>p
              </span>
              <button onClick={() => logout(navigate)} style={{ padding:'6px 12px', background:'#fff5f5', border:'1px solid #ffcdd2', borderRadius:'8px', color:'#e53935', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Logout</button>
            </div>
            <div style={{ flex:1, padding:'16px', overflowY:'auto' }}>
              <div style={{ marginBottom:'20px' }}>
                <h1 style={{ fontSize:'20px', fontWeight:800, color:C.text }}>Find an item 🔍</h1>
                <p style={{ fontSize:'13px', color:C.textMid, marginTop:'3px' }}>Ask in your own words — Hindi or English</p>
              </div>
              {searchCard}
              {errorCard}
              {loadingCard}
              {resultCard}
            </div>
            <BottomNav active="find" />
          </>
        ) : (
          <div style={{ display:'flex', flex:1 }}>
            <Sidebar active="find" />
            <div style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
              <div style={{ marginBottom:'24px' }}>
                <h1 style={{ fontSize:'24px', fontWeight:800, color:C.text }}>Find an item 🔍</h1>
                <p style={{ fontSize:'13px', color:C.textMid, marginTop:'3px' }}>Ask in plain English or Hindi</p>
              </div>
              {searchCard}
              {errorCard}
              {loadingCard}
              {resultCard}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default FindItemPage;