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
                <Link to="/dashboard" style={navLinkStyle}>
                  Профиль
                </Link>
                <Link to="/teams" style={navLinkStyle}>
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
              <Link to="/login" style={navLinkStyle}>
                Вход
              </Link>
            )}
            {location.pathname !== '/register' && (
              <Link to="/register" style={navLinkStyle}>
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
  transition: 'background-color 0.3s',
  ':hover': { backgroundColor: '#3a3f4b' }
};

const logoutButtonStyle = {
  background: 'none',
  border: '1px solid white',
  color: 'white',
  padding: '0.5rem 1rem',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
  ':hover': { backgroundColor: '#3a3f4b' }
};

export default Header;