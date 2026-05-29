import { useNavigate } from 'react-router-dom';
import { logout } from '../hooks/useSession';

const C = {
  green:'#00c48c', greenBg:'#f0faf5', greenLight:'#e0f8ef',
  greenBorder:'#d6ede4', purple:'#6c63ff', red:'#ff6b6b',
  text:'#0d4d32', textMid:'#5a8070', textLight:'#a0b8b0',
  white:'#ffffff',
};

const NAV_ITEMS = [
  { icon:'➕', label:'Log Item',  path:'/log',     key:'log'     },
  { icon:'🔍', label:'Find Item', path:'/find',    key:'find'    },
  { icon:'📋', label:'History',   path:'/history', key:'history' },
];

function Sidebar({ active, itemCount = 0 }) {
  const navigate = useNavigate();
  const email    = localStorage.getItem('email') || '';

  return (
    <div style={{
      width:'210px', flexShrink:0, background:C.white,
      borderRight:`1px solid ${C.greenBorder}`,
      display:'flex', flexDirection:'column',
      height:'100vh', position:'sticky', top:0,
    }}>

      {/* LOGO */}
      <div style={{ padding:'20px 16px 16px', borderBottom:`1px solid ${C.greenBorder}`, display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'34px', height:'34px', background:C.greenBg, borderRadius:'10px', border:`1px solid ${C.greenBorder}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="20" height="20" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="18" r="12" fill="#00c48c"/>
            <circle cx="22" cy="18" r="6" fill="#fff"/>
            <rect x="20.2" y="28" width="3.6" height="10" rx="1.8" fill="#00c48c"/>
          </svg>
        </div>
        <span style={{ fontSize:'20px', fontWeight:800, color:C.text }}>
          K<span style={{color:C.green}}>e</span>
          <span style={{color:C.purple}}>e</span>
          <span style={{color:C.red}}>p</span>
        </span>
      </div>

      {/* NAV ITEMS */}
      <div style={{ padding:'12px 10px', flex:1 }}>
        <div style={{ fontSize:'10px', fontWeight:700, color:C.textLight, letterSpacing:'0.08em', textTransform:'uppercase', padding:'0 8px', marginBottom:'8px' }}>
          Menu
        </div>
        {NAV_ITEMS.map(item => {
          const isActive = active === item.key;
          return (
            <div key={item.key} onClick={() => navigate(item.path)}
              style={{
                display:'flex', alignItems:'center', gap:'10px',
                padding:'11px 12px', borderRadius:'12px',
                background: isActive ? C.greenLight : 'transparent',
                border: isActive ? `1px solid ${C.greenBorder}` : '1px solid transparent',
                color: isActive ? C.text : C.textMid,
                fontWeight: isActive ? 700 : 500,
                fontSize:'14px', cursor:'pointer', marginBottom:'4px',
                fontFamily:"'Segoe UI',system-ui,sans-serif",
              }}>
              <span>{item.icon}</span>
              <span style={{flex:1}}>{item.label}</span>
              {item.key === 'history' && itemCount > 0 && (
                <span style={{ background:C.green, color:'#fff', borderRadius:'8px', padding:'1px 7px', fontSize:'11px', fontWeight:700 }}>
                  {itemCount}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* USER + LOGOUT */}
      <div style={{ padding:'14px 14px 20px', borderTop:`1px solid ${C.greenBorder}` }}>
        {/* user info */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:C.greenBg, borderRadius:'12px', border:`1px solid ${C.greenBorder}`, marginBottom:'10px' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:C.green, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, color:'#fff', flexShrink:0 }}>
            {email.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{minWidth:0}}>
            <div style={{ fontSize:'12px', fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {email.split('@')[0]}
            </div>
            <div style={{ fontSize:'10px', color:C.textLight, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {email}
            </div>
          </div>
        </div>

        {/* logout */}
        <button onClick={() => logout(navigate)}
          style={{ width:'100%', padding:'11px', background:'#fff5f5', border:'1.5px solid #ffcdd2', borderRadius:'12px', color:'#e53935', fontSize:'13px', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'7px', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
          🚪 Logout
        </button>
      </div>

    </div>
  );
}

export default Sidebar;
