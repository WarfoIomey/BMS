import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      fetchCurrentUser();
    } else {
      localStorage.removeItem("token");
      setUser(null);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get("/api/users/me/", {
        headers: { Authorization: `Token ${token}` },
      });
      setUser(res.data);
    } catch (err) {
      console.error("Ошибка загрузки текущего пользователя", err);
      setUser(null);
      setToken(null);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post("/api/auth/token/login/", {
        email,
        password,
      });
      setToken(res.data.auth_token);
      return true;
    } catch (err) {
      console.error("Ошибка входа", err.response?.data || err.message);
      return false;
    }
  };

  const register = async (email, username, password) => {
    try {
      await axios.post("/api/users/", {
        email,
        username,
        password,
      });
      return await login(email, password);
    } catch (err) {
      console.error("Ошибка регистрации", err.response?.data || err.message);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)