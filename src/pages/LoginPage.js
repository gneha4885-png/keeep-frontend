import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://keeep-backend.onrender.com';

const C = {
  green:'#00c48c', greenBg:'#f0faf5', greenLight:'#e0f8ef',
  greenBorder:'#d6ede4', purple:'#6c63ff', red:'#ff6b6b',
  text:'#0d4d32', textMid:'#5a8070', textLight:'#a0b8b0',
  white:'#ffffff', inputBg:'#f2fbf7',
};

// ── defined OUTSIDE LoginPage so they never remount ──────────
const inp = {
  width: '100%', padding: '13px 14px',
  background: C.inputBg, border: `1.5px solid ${C.greenBorder}`,
  borderRadius: '12px', fontSize: '14px', color: '#1a1a1a',
  outline: 'none', boxSizing: 'border-box',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  marginBottom: '12px', cursor: 'text', display: 'block',
};

const socialBtn = {
  flex: 1, display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: '7px', padding: '12px',
  border: `1.5px solid ${C.greenBorder}`, borderRadius: '12px',
  background: C.white, fontSize: '13px', fontWeight: 500,
  color: '#444', cursor: 'pointer',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
};

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
  </svg>
);

function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [isLogin,  setIsLogin]  = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showWake, setShowWake] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  // ping server on load
  useEffect(() => {
    axios.get(API + '/health').catch(() => {});
  }, []);

  // responsive
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // skip login if already logged in
  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/log');
  }, [navigate]);

  async function handleSubmit() {
    if (!email || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    const wakeTimer = setTimeout(() => setShowWake(true), 3000);
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const res = await axios.post(API + endpoint, { email, password });
      clearTimeout(wakeTimer); setShowWake(false);
      localStorage.setItem('token',      res.data.token);
      localStorage.setItem('user_id',    res.data.user_id);
      localStorage.setItem('email',      res.data.email);
      localStorage.setItem('login_time', Date.now().toString());
      navigate('/log');
    } catch (err) {
      clearTimeout(wakeTimer); setShowWake(false);
      setError(err.response?.data?.detail || 'Something went wrong. Try again.');
    }
    setLoading(false);
  }

  function switchTab(loginMode) {
    setIsLogin(loginMode);
    setError('');
  }

  // ── WEB ───────────────────────────────────────────────────
  if (!isMobile) return (
    <>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        input:focus{border-color:#00c48c !important;background:#fff !important;outline:none !important;}
      `}</style>
      <div style={{ display:'flex', minHeight:'100vh', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

        {/* LEFT branding */}
        <div style={{ flex:1, background:C.greenBg, padding:'48px', display:'flex', flexDirection:'column', justifyContent:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', width:'200px', height:'200px', borderRadius:'50%', background:'#00d09c', opacity:0.12, bottom:'-70px', left:'-60px', pointerEvents:'none' }} />
          <div style={{ position:'absolute', width:'100px', height:'100px', borderRadius:'50%', background:'#6c63ff', opacity:0.1, top:'20px', right:'20px', pointerEvents:'none' }} />

          <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'36px', position:'relative', zIndex:1 }}>
            <div style={{ width:'52px', height:'52px', background:C.white, borderRadius:'14px', border:`1px solid ${C.greenBorder}`, display:'flex', alignItems:'center', justifyContent:'center', animation:'float 3.5s ease-in-out infinite' }}>
              <svg width="28" height="28" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="18" r="12" fill="#00c48c"/><circle cx="22" cy="18" r="6" fill="#fff"/><rect x="20.2" y="28" width="3.6" height="10" rx="1.8" fill="#00c48c"/></svg>
            </div>
            <span style={{ fontSize:'26px', fontWeight:800, color:C.text }}>
             K<span style={{color:C.green}}>e</span><span style={{color:C.purple}}>e</span><span style={{color:C.red}}>e</span>p
            </span>
          </div>

          <h1 style={{ fontSize:'36px', fontWeight:800, color:'#0d3d28', lineHeight:1.2, marginBottom:'12px', position:'relative', zIndex:1 }}>
  Keeep track of<br/><span style={{ color: C.green }}>everything you own!</span>
</h1>
<p style={{ fontSize:'14px', color:C.textMid, lineHeight:1.7, marginBottom:'32px', position:'relative', zIndex:1 }}>
  Your AI-powered item tracker.<br/>
  <span style={{ color:C.green, fontWeight:600, fontStyle:'italic' }}>"Log once, find forever"</span>
</p>

          <div style={{ display:'flex', flexDirection:'column', gap:'14px', position:'relative', zIndex:1 }}>
            {[
              { icon:'⚡', text:'Find any item instantly with Claude AI',   bg:'#e0f8ef', border:'#a8eddc', color:'#007a5a' },
              { icon:'🎤', text:'Log by voice — Hindi & English supported', bg:'#f0eefe', border:'#c8c3f5', color:'#5048cc' },
              { icon:'👨‍👩‍👧', text:'Share item locations with your family',   bg:'#fff0f0', border:'#ffbdbd', color:'#c04040' },
            ].map((f,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:f.bg, border:`1px solid ${f.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0, pointerEvents:'none' }}>{f.icon}</div>
                <span style={{ fontSize:'13px', color:'#4a7060', fontWeight:500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT form — ALL inline JSX, no child components */}
        <div style={{ width:'400px', flexShrink:0, background:'rgba(255,255,255,0.97)', borderLeft:`1px solid ${C.greenBorder}`, padding:'48px 40px', display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ fontSize:'22px', fontWeight:800, color:C.text, marginBottom:'4px' }}>Welcome back 👋</div>
          <div style={{ fontSize:'13px', color:C.textLight, marginBottom:'28px' }}>Sign in to your Keeep account</div>

          {/* tabs — inline */}
          <div style={{ display:'flex', borderBottom:`1.5px solid ${C.greenBorder}`, marginBottom:'20px' }}>
            <button onClick={() => switchTab(true)}
              style={{ flex:1, padding:'10px 0', fontSize:'14px', fontWeight: isLogin ? 700 : 500, color: isLogin ? C.text : C.textLight, background:'none', border:'none', cursor:'pointer', position:'relative', fontFamily:'inherit' }}>
              Login
              {isLogin && <div style={{ position:'absolute', bottom:'-1.5px', left:'15%', right:'15%', height:'2.5px', background:C.green, borderRadius:'2px' }} />}
            </button>
            <button onClick={() => switchTab(false)}
              style={{ flex:1, padding:'10px 0', fontSize:'14px', fontWeight: !isLogin ? 700 : 500, color: !isLogin ? C.text : C.textLight, background:'none', border:'none', cursor:'pointer', position:'relative', fontFamily:'inherit' }}>
              Register
              {!isLogin && <div style={{ position:'absolute', bottom:'-1.5px', left:'15%', right:'15%', height:'2.5px', background:C.green, borderRadius:'2px' }} />}
            </button>
          </div>

          {/* wake toast — inline */}
          {showWake && (
            <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:'10px', padding:'10px 14px', fontSize:'12px', color:'#b07800', marginBottom:'16px' }}>
              ⏳ Server warming up, please wait ~20 sec...
            </div>
          )}

          {/* email — plain input, NO span */}
          <input style={inp} type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />

          {/* password — plain input, NO span */}
          <input style={inp} type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoComplete="current-password" />

          {isLogin && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px', marginTop:'-4px' }}>
              <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:C.textMid, cursor:'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor:C.green }} /> Remember me
              </label>
              <button style={{ fontSize:'12px', color:C.purple, fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                Forgot password?
              </button>
            </div>
          )}

          {error && <div style={{ background:'#fff5f5', border:'1px solid #ffcdd2', borderRadius:'10px', padding:'10px 14px', color:'#e53935', fontSize:'13px', marginBottom:'14px' }}>{error}</div>}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width:'100%', padding:'15px', background:C.green, color:C.white, border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: loading ? 0.8 : 1, marginBottom:'4px' }}>
            {loading ? '⏳ Please wait...' : (isLogin ? 'Login to Keeep' : 'Create Account')}
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'16px 0 14px' }}>
            <div style={{ flex:1, height:'0.5px', background:C.greenBorder }} />
            <span style={{ fontSize:'12px', color:C.textLight }}>or continue with</span>
            <div style={{ flex:1, height:'0.5px', background:C.greenBorder }} />
          </div>

          <div style={{ display:'flex', gap:'10px' }}>
            <button style={socialBtn}><GoogleIcon /> Google</button>
            <button style={socialBtn}>🍎 Apple</button>
          </div>

          <div style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color:C.textLight }}>
            {isLogin ? 'New to Keeep? ' : 'Have an account? '}
            <button style={{ color:C.purple, fontWeight:600, background:'none', border:'none', cursor:'pointer', fontSize:'13px', fontFamily:'inherit' }}
              onClick={() => switchTab(!isLogin)}>
              {isLogin ? 'Create account →' : 'Login →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // ── MOBILE — all inline JSX ───────────────────────────────
  return (
    <>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        input:focus{border-color:#00c48c !important;background:#fff !important;}
      `}</style>
      <div style={{ minHeight:'100vh', background:C.greenBg, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <div style={{ height:'3px', background:'linear-gradient(90deg,#00d09c,#6c63ff,#ff6b6b)' }} />

        {/* hero */}
        <div style={{ padding:'40px 24px 28px', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', width:'160px', height:'160px', borderRadius:'50%', background:'#00d09c', opacity:0.12, top:'-60px', right:'-50px', pointerEvents:'none' }} />
          <div style={{ width:'72px', height:'72px', background:C.white, borderRadius:'20px', border:`1px solid ${C.greenBorder}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', animation:'float 3.5s ease-in-out infinite' }}>
            <svg width="38" height="38" viewBox="0 0 44 44" fill="none"><circle cx="22" cy="18" r="12" fill="#00c48c"/><circle cx="22" cy="18" r="6" fill="#fff"/><rect x="20.2" y="28" width="3.6" height="10" rx="1.8" fill="#00c48c"/></svg>
          </div>
          <div style={{ fontSize:'28px', fontWeight:800, color:C.text, marginTop:'14px' }}>
            K<span style={{color:C.green}}>e</span><span style={{color:C.purple}}>e</span><span style={{color:C.red}}>p</span>
          </div>
          <div style={{ fontSize:'13px', color:C.textMid, marginTop:'4px' }}>Never forget where you kept things</div>
        </div>

        {/* form card */}
        <div style={{ margin:'0 16px 24px', background:'rgba(255,255,255,0.95)', borderRadius:'20px', padding:'24px 20px', border:`1px solid ${C.greenBorder}` }}>

          {/* tabs — inline */}
          <div style={{ display:'flex', borderBottom:`1.5px solid ${C.greenBorder}`, marginBottom:'20px' }}>
            <button onClick={() => switchTab(true)}
              style={{ flex:1, padding:'10px 0', fontSize:'14px', fontWeight: isLogin ? 700 : 500, color: isLogin ? C.text : C.textLight, background:'none', border:'none', cursor:'pointer', position:'relative', fontFamily:'inherit' }}>
              Login
              {isLogin && <div style={{ position:'absolute', bottom:'-1.5px', left:'15%', right:'15%', height:'2.5px', background:C.green, borderRadius:'2px' }} />}
            </button>
            <button onClick={() => switchTab(false)}
              style={{ flex:1, padding:'10px 0', fontSize:'14px', fontWeight: !isLogin ? 700 : 500, color: !isLogin ? C.text : C.textLight, background:'none', border:'none', cursor:'pointer', position:'relative', fontFamily:'inherit' }}>
              Register
              {!isLogin && <div style={{ position:'absolute', bottom:'-1.5px', left:'15%', right:'15%', height:'2.5px', background:C.green, borderRadius:'2px' }} />}
            </button>
          </div>

          {showWake && (
            <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:'10px', padding:'8px 12px', fontSize:'12px', color:'#b07800', marginBottom:'14px' }}>
              ⏳ Server warming up, please wait ~20 sec...
            </div>
          )}

          <input style={inp} type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />

          <input style={inp} type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoComplete="current-password" />

          {isLogin && (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', marginTop:'-4px' }}>
              <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:C.textMid, cursor:'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor:C.green }} /> Keep me logged in
              </label>
              <button style={{ fontSize:'12px', color:C.purple, fontWeight:600, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Forgot?</button>
            </div>
          )}

          {error && <div style={{ background:'#fff5f5', border:'1px solid #ffcdd2', borderRadius:'10px', padding:'10px 14px', color:'#e53935', fontSize:'13px', marginBottom:'14px' }}>{error}</div>}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width:'100%', padding:'15px', background:C.green, color:C.white, border:'none', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: loading ? 0.8 : 1, marginBottom:'4px' }}>
            {loading ? '⏳ Please wait...' : (isLogin ? 'Login to Keeep' : 'Create Account')}
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'16px 0 14px' }}>
            <div style={{ flex:1, height:'0.5px', background:C.greenBorder }} />
            <span style={{ fontSize:'12px', color:C.textLight }}>or continue with</span>
            <div style={{ flex:1, height:'0.5px', background:C.greenBorder }} />
          </div>

          <div style={{ display:'flex', gap:'10px' }}>
            <button style={socialBtn}><GoogleIcon /> Google</button>
            <button style={socialBtn}>🍎 Apple</button>
          </div>

          <div style={{ textAlign:'center', marginTop:'16px', fontSize:'13px', color:C.textLight }}>
            {isLogin ? 'New to Keeep? ' : 'Have an account? '}
            <button style={{ color:C.purple, fontWeight:600, background:'none', border:'none', cursor:'pointer', fontSize:'13px', fontFamily:'inherit' }}
              onClick={() => switchTab(!isLogin)}>
              {isLogin ? 'Create account →' : 'Login →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
