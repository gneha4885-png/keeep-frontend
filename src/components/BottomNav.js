import { useNavigate, useLocation } from 'react-router-dom';

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/log', label: 'Log', icon: '✏️' },
    { path: '/find', label: 'Find', icon: '🔍' },
    { path: '/history', label: 'History', icon: '📋' },
  ];

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '390px',
      background: 'white',
      borderTop: '1px solid #f0f5f0',
      display: 'flex', zIndex: 100,
      boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      {tabs.map(tab => {
        const active = location.pathname === tab.path;
        return (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            style={{
              flex: 1, padding: '12px 8px 14px',
              background: 'transparent', border: 'none',
              color: active ? '#1a6b3a' : '#bbb',
              cursor: 'pointer', fontSize: '10px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '4px',
              fontWeight: active ? '600' : '400',
              transition: 'all 0.2s', position: 'relative',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.3px', textTransform: 'uppercase'
            }}
          >
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: '28px', height: '3px',
                background: 'linear-gradient(90deg, #1a6b3a, #2d9e5a)',
                borderRadius: '0 0 4px 4px'
              }} />
            )}
            <span style={{ fontSize: '20px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default BottomNav;
