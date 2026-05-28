import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'https://keeep-backend.onrender.com';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit() {
    if (!email || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const response = await axios.post(API + endpoint, { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user_id', response.data.user_id);
      localStorage.setItem('email', response.data.email);
      navigate('/log');
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f8f5', display: 'flex', flexDirection: 'column', maxWidth: '390px', margin: '0 auto' }}>

      {/* Green header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f4d28, #1a6b3a, #2d9e5a)',
        padding: '60px 24px 40px', textAlign: 'center'
      }}>
        <div style={{
          width: '68px', height: '68px', background: 'white',
          borderRadius: '20px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '30px',
          margin: '0 auto 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}>📍</div>
        <h1 style={{ color: 'white', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.3px' }}>Keeep</h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', marginTop: '6px' }}>Your AI memory assistant</p>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: '24px 20px' }}>
        <div style={{
          background: 'white', borderRadius: '20px', padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          {/* Toggle */}
          <div style={{ display: 'flex', background: '#f5f8f5', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
            {['Login', 'Register'].map((tab, i) => (
              <button key={tab} onClick={() => { setIsLogin(i === 0); setError(''); }}
                style={{
                  flex: 1, padding: '10px',
                  background: (isLogin ? i === 0 : i === 1) ? 'white' : 'transparent',
                  border: 'none', borderRadius: '10px',
                  color: (isLogin ? i === 0 : i === 1) ? '#1a6b3a' : '#999',
                  fontSize: '14px', fontWeight: (isLogin ? i === 0 : i === 1) ? '600' : '400',
                  cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: (isLogin ? i === 0 : i === 1) ? '0 1px 6px rgba(0,0,0,0.08)' : 'none'
                }}
              >{tab}</button>
            ))}
          </div>

          <input className="input-light" type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)}
            style={{ marginBottom: '12px' }} />

          <input className="input-light" type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            style={{ marginBottom: '20px' }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #ffcdd2',
              borderRadius: '10px', padding: '10px 14px',
              color: '#e53935', fontSize: '13px', marginBottom: '16px'
            }}>{error}</div>
          )}

          <button className="btn-green" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#999' }}>
          Powered by Claude AI 🤖
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
