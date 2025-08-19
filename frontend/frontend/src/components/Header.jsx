import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAuthPage = ['/login', '/register', '/'].includes(location.pathname);

  // Функция для определения активного пути
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Стиль для активной ссылки
  const activeLinkStyle = {
    ...navLinkStyle,
    backgroundColor: '#3a3f4b',
    fontWeight: 'bold'
  };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: '#282c34',
      color: 'white',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        <Link to={user ? "/dashboard" : "/"} style={{ color: 'white', textDecoration: 'none' }}>
          BMS
        </Link>
      </div>
      
      <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {user ? (
          <>
            {!isAuthPage && (
              <>
                <Link 
                  to="/dashboard" 
                  style={isActive('/dashboard') ? activeLinkStyle : navLinkStyle}
                >
                  Профиль
                </Link>
                <Link 
                  to="/teams" 
                  style={isActive('/teams') ? activeLinkStyle : navLinkStyle}
                >
                  Команды
                </Link>
              </>
            )}
            <button onClick={handleLogout} style={logoutButtonStyle}>
              Выход ({user.username})
            </button>
          </>
        ) : (
          <>
            {location.pathname !== '/login' && (
              <Link 
                to="/login" 
                style={isActive('/login') ? activeLinkStyle : navLinkStyle}
              >
                Вход
              </Link>
            )}
            {location.pathname !== '/register' && (
              <Link 
                to="/register" 
                style={isActive('/register') ? activeLinkStyle : navLinkStyle}
              >
                Регистрация
              </Link>
            )}
          </>
        )}
      </nav>
    </header>
  );
};

const navLinkStyle = {
  color: 'white', 
  textDecoration: 'none',
  padding: '0.5rem 1rem',
  borderRadius: '4px',
  transition: 'all 0.3s ease',
  ':hover': { 
    backgroundColor: '#3a3f4b',
    transform: 'translateY(-2px)'
  }
};

const logoutButtonStyle = {
  background: 'none',
  border: '1px solid white',
  color: 'white',
  padding: '0.5rem 1rem',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  ':hover': { 
    backgroundColor: '#3a3f4b',
    transform: 'translateY(-2px)'
  }
};

export default Header;