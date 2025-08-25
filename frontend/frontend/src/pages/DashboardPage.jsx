import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user: currentUser, token, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    bio: ""
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/users/me/", {
        headers: { Authorization: `Token ${token}` },
      });
      setUserData(response.data);
      setFormData({
        email: response.data.email,
        username: response.data.username,
        first_name: response.data.first_name || "",
        last_name: response.data.last_name || "",
        bio: response.data.bio || ""
      });
    } catch (err) {
      console.error("Ошибка загрузки данных пользователя", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `http://127.0.0.1:8000/api/users/${currentUser.id}/`,
        formData,
        { headers: { Authorization: `Token ${token}` } }
      );
      setSuccess("Данные успешно обновлены!");
      setError(null);
      setIsEditing(false);
      fetchUserData();
    } catch (err) {
      setError(err.response?.data || "Ошибка обновления данных");
      setSuccess(null);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const oldPassword = e.target.oldPassword.value;
    const newPassword = e.target.newPassword.value;
    
    try {
      await axios.post(
        "http://127.0.0.1:8000/api/users/set_password/",
        { current_password: oldPassword, new_password: newPassword },
        { headers: { Authorization: `Token ${token}` } }
      );
      setSuccess("Пароль успешно изменен!");
      setError(null);
      e.target.reset();
    } catch (err) {
      setError(err.response?.data || "Ошибка изменения пароля");
      setSuccess(null);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/users/${currentUser.id}/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      setSuccess("Аккаунт успешно удален!");
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (err) {
      setError(err.response?.data || "Ошибка удаления аккаунта");
      setSuccess(null);
    }
  };

  if (!userData) return <p>Загрузка...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Профиль пользователя</h2>
      {error && <div style={styles.error}>{JSON.stringify(error)}</div>}
      {success && <div style={styles.success}>{success}</div>}
      {isEditing ? (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label>Имя пользователя:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              style={styles.input}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label>Имя:</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Фамилия:</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>О себе:</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              style={styles.textarea}
              rows="4"
            />
          </div>
          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.saveButton}>Сохранить</button>
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              style={styles.cancelButton}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        <div style={styles.profileInfo}>
          <p><strong>Email:</strong> {userData.email}</p>
          <p><strong>Имя пользователя:</strong> {userData.username}</p>
          <p><strong>Имя:</strong> {userData.first_name || "Не указано"}</p>
          <p><strong>Фамилия:</strong> {userData.last_name || "Не указана"}</p>
          <p><strong>Роль:</strong> {userData.role}</p>
          <p><strong>О себе:</strong> {userData.bio || "Не указано"}</p>
          
          <div style={styles.buttonGroup}>
            <button 
              onClick={() => setIsEditing(true)}
              style={styles.editButton}
            >
              Редактировать профиль
            </button>
            <button onClick={logout} style={styles.logoutButton}>
              Выйти
            </button>
          </div>
        </div>
      )}
      <div style={styles.section}>
        <h3 style={styles.subtitle}>Смена пароля</h3>
        <form onSubmit={handlePasswordChange} style={styles.form}>
          <div style={styles.formGroup}>
            <label>Текущий пароль:</label>
            <input
              type="password"
              name="oldPassword"
              style={styles.input}
              required
            />
          </div>
          
          <div style={styles.formGroup}>
            <label>Новый пароль:</label>
            <input
              type="password"
              name="newPassword"
              style={styles.input}
              required
            />
          </div>
          
          <button type="submit" style={styles.saveButton}>
            Сменить пароль
          </button>
        </form>
      </div>
      <div style={styles.section}>
        <h3 style={styles.subtitle}>Удаление аккаунта</h3>
        <p style={styles.warningText}>
          Внимание: Это действие необратимо. Все ваши данные будут удалены без возможности восстановления.
        </p>
        
        {!showDeleteConfirm ? (
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            style={styles.deleteButton}
          >
            Удалить аккаунт
          </button>
        ) : (
          <div style={styles.deleteConfirm}>
            <p style={styles.confirmText}>
              Вы уверены, что хотите удалить свой аккаунт? Это действие нельзя отменить.
            </p>
            <div style={styles.buttonGroup}>
              <button 
                onClick={handleDeleteAccount}
                style={styles.confirmDeleteButton}
              >
                Да, удалить аккаунт
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                style={styles.cancelButton}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "30px auto",
    padding: "20px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    color: "#333",
    marginBottom: "30px",
  },
  subtitle: {
    color: "#444",
    margin: "20px 0 15px",
    paddingBottom: "5px",
    borderBottom: "1px solid #eee",
  },
  profileInfo: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "5px",
    marginBottom: "20px",
  },
  form: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "5px",
    marginBottom: "20px",
  },
  formGroup: {
    marginBottom: "15px",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: "8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "16px",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "16px",
    resize: "vertical",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },
  editButton: {
    padding: "10px 15px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  saveButton: {
    padding: "10px 15px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "10px 15px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  logoutButton: {
    padding: "10px 15px",
    backgroundColor: "#ff9800",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  deleteButton: {
    padding: "10px 15px",
    backgroundColor: "#d32f2f",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  confirmDeleteButton: {
    padding: "10px 15px",
    backgroundColor: "#d32f2f",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  error: {
    color: "red",
    backgroundColor: "#ffebee",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "20px",
  },
  success: {
    color: "green",
    backgroundColor: "#e8f5e9",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "20px",
  },
  section: {
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "5px",
  },
  warningText: {
    color: "#d32f2f",
    marginBottom: "15px",
    fontWeight: "bold",
  },
  deleteConfirm: {
    padding: "15px",
    backgroundColor: "#ffebee",
    borderRadius: "5px",
    border: "1px solid #ffcdd2",
  },
  confirmText: {
    color: "#d32f2f",
    marginBottom: "15px",
  },
};