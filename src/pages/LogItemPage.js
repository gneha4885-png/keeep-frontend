import { useState } from 'react';
import axios from 'axios';

const API = 'https://keeep-backend.onrender.com';

function LogItemPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [lastSaved, setLastSaved] = useState(null);
  const email = localStorage.getItem('email') || 'User';
  const userId = localStorage.getItem('user_id') || 'neha123';

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function handleSave() {
    if (!text.trim() || text.length < 5) { showToast('Please describe where you kept the item!'); return; }
    setLoading(true);
    try {
      const response = await axios.post(API + '/log-item', { text, user_id: userId });
      setLastSaved(response.data);
      showToast('Saved successfully!');
      setText('');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Cannot connect to server');
    }
    setLoading(false);
  }

  function handleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showToast('Voice not supported — use Chrome'); return; }
    const r = new SR();
    r.lang = 'en-IN';
    r.onresult = e => { setText(e.results[0][0].transcript); showToast('Voice captured!'); };
    r.start();
    showToast('Listening...');
  }

  const suggestions = [
    { icon: '💳', text: 'I kept my Aadhaar card in the top drawer of my desk' },
    { icon: '🔑', text: 'Car keys are on the hook near the main door' },
    { icon: '💊', text: 'Medicines are in the kitchen cabinet top shelf' },
    { icon: '📘', text: 'Passport is in the blue folder in the cupboard' },
  ];

  return (
    <div className="app-container">

      {/* Header */}
      <div className="g-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', marginBottom: '3px' }}>Good day 👋</p>
            <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '700', letterSpacing: '-0.3px' }}>
              {email.split('@')[0]}
            </h1>
          </div>
          <div style={{
            width: '42px', height: '42px', background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '20px'
          }}>📍</div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Last saved */}
        {lastSaved && (
          <div className="animate-up" style={{
            background: 'rgba(45,158,90,0.08)', border: '1px solid rgba(45,158,90,0.2)',
            borderRadius: '14px', padding: '12px 16px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <span style={{ fontSize: '22px' }}>✅</span>
            <div>
              <p style={{ fontSize: '13px', color: '#1a6b3a', fontWeight: '600' }}>Just saved!</p>
              <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                {lastSaved.item_name} → {lastSaved.location}
              </p>
            </div>
          </div>
        )}

        {/* Input card */}
        <div className="card animate-up">
          <div className="label">Where did you keep it?</div>
          <div style={{ position: 'relative' }}>
            <textarea className="input-light"
              value={text} onChange={e => setText(e.target.value)}
              placeholder="e.g. I kept my passport in the blue drawer in the bedroom..."
              style={{ height: '110px', resize: 'none', paddingRight: '50px', borderRadius: '12px' }}
            />
            <button onClick={handleVoice} style={{
              position: 'absolute', bottom: '10px', right: '10px',
              width: '34px', height: '34px',
              background: 'rgba(26,107,58,0.1)', border: '1px solid rgba(26,107,58,0.2)',
              borderRadius: '10px', cursor: 'pointer', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>🎤</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0 14px' }}>
            <span style={{ fontSize: '11px', color: '#ccc' }}>{text.length} / 500</span>
            {text && <button onClick={() => setText('')} style={{ background: 'none', border: 'none', color: '#999', fontSize: '12px', cursor: 'pointer' }}>Clear</button>}
          </div>
          <button className="btn-green" onClick={handleSave} disabled={loading}>
            {loading ? '✨ Saving with AI...' : 'Save Location'}
          </button>
        </div>

        {/* Suggestions */}
        <div className="card">
          <div className="label">Quick examples — tap to use</div>
          {suggestions.map((s, i) => (
            <div key={i} onClick={() => setText(s.text)} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '11px 12px', borderRadius: '10px', cursor: 'pointer',
              marginBottom: i < suggestions.length - 1 ? '6px' : '0',
              border: '1px solid #f0f5f0', background: '#f9fdf9',
              transition: 'all 0.15s'
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(26,107,58,0.25)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#f0f5f0'}
            >
              <span style={{ width: '32px', height: '32px', background: 'rgba(26,107,58,0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>{s.icon}</span>
              <span style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => { localStorage.clear(); window.location.href = '/'; }}
        style={{ position: 'fixed', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', zIndex: 999, fontFamily: 'Inter, sans-serif' }}>
        Logout
      </button>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

export default LogItemPage;
