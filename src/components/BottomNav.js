import { useNavigate } from 'react-router-dom';

const C = {
  green: '#00c48c', greenLight: '#e0f8ef', greenBorder: '#d6ede4',
  text: '#0d4d32', textLight: '#a0b8b0', white: '#ffffff',
};

const NAV_ITEMS = [
  { icon: '➕', label: 'Log',     path: '/log',     key: 'log'     },
  { icon: '🔍', label: 'Find',    path: '/find',    key: 'find'    },
  { icon: '📋', label: 'History', path: '/history', key: 'history' },
];

function BottomNav({ active }) {
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      display: 'flex',
      background: C.white,
      borderTop: `1px solid ${C.greenBorder}`,
      padding: '8px 0 16px',
      zIndex: 100,
      boxShadow: '0 -2px 16px rgba(0,80,50,0.06)',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              padding: '6px 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              position: 'relative',
            }}
          >
            {/* active indicator dot */}
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '20px',
                height: '3px',
                background: C.green,
                borderRadius: '0 0 3px 3px',
              }} />
            )}
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{
              fontSize: '10px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? C.green : C.textLight,
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default BottomNav;