import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user: currentUser, token, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const [evaluationsData, setEvaluationsData] = useState(null);
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
  const [activeTab, setActiveTab] = useState("profile");
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get("/api/users/me/", {
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
      setError("Не удалось загрузить данные пользователя");
    }
  };

  const fetchEvaluationsData = async () => {
    setLoadingEvaluations(true);
    try {
      const response = await axios.get("/api/users/me-evaluations/", {
        headers: { Authorization: `Token ${token}` },
      });
      setEvaluationsData(response.data);
      setError(null);
    } catch (err) {
      console.error("Ошибка загрузки оценок", err);
      setEvaluationsData({ average_rating: 0, total_evaluations: 0, evaluations: [] });
      setError("Не удалось загрузить оценки");
    } finally {
      setLoadingEvaluations(false);
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
        `/api/users/${currentUser.id}/`,
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
        "/api/users/set_password/",
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
        `/api/users/${currentUser.id}/`,
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

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (tabName === "evaluations" && !evaluationsData) {
      fetchEvaluationsData();
    }
  };

  if (!userData) return <p style={styles.loading}>Загрузка...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Профиль пользователя</h2>
      
      {/* Навигация по табам */}
      <div style={styles.tabs}>
        <button 
          style={activeTab === "profile" ? styles.activeTab : styles.tab}
          onClick={() => handleTabChange("profile")}
        >
          Профиль
        </button>
        <button 
          style={activeTab === "evaluations" ? styles.activeTab : styles.tab}
          onClick={() => handleTabChange("evaluations")}
        >
          Мои оценки {evaluationsData && `(${evaluationsData.total_evaluations})`}
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          {typeof error === 'object' ? JSON.stringify(error) : error}
        </div>
      )}
      {success && <div style={styles.success}>{success}</div>}

      {activeTab === "profile" ? (
        <ProfileTab
          userData={userData}
          isEditing={isEditing}
          formData={formData}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          setIsEditing={setIsEditing}
          handlePasswordChange={handlePasswordChange}
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
          handleDeleteAccount={handleDeleteAccount}
          logout={logout}
        />
      ) : (
        <EvaluationsTab
          evaluationsData={evaluationsData}
          loading={loadingEvaluations}
          onRefresh={fetchEvaluationsData}
        />
      )}
    </div>
  );
}

// Компонент вкладки профиля
const ProfileTab = ({
  userData,
  isEditing,
  formData,
  handleInputChange,
  handleSubmit,
  setIsEditing,
  handlePasswordChange,
  showDeleteConfirm,
  setShowDeleteConfirm,
  handleDeleteAccount,
  logout
}) => {
  return (
    <>
      {isEditing ? (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email:</label>
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
            <label style={styles.label}>Имя пользователя:</label>
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
            <label style={styles.label}>Имя:</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Фамилия:</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>О себе:</label>
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
            <label style={styles.label}>Текущий пароль:</label>
            <input
              type="password"
              name="oldPassword"
              style={styles.input}
              required
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Новый пароль:</label>
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
    </>
  );
};

// Компонент вкладки оценок
const EvaluationsTab = ({ evaluationsData, loading, onRefresh }) => {
  if (loading) {
    return <p style={styles.loading}>Загрузка оценок...</p>;
  }

  if (!evaluationsData) {
    return (
      <div style={styles.evaluationsContainer}>
        <button onClick={onRefresh} style={styles.refreshButton}>
          Загрузить оценки
        </button>
      </div>
    );
  }

  const { average_rating, total_evaluations, evaluations } = evaluationsData;

  return (
    <div style={styles.evaluationsContainer}>
      <div style={styles.evaluationsHeader}>
        <button onClick={onRefresh} style={styles.refreshButton}>
          Обновить
        </button>
      </div>

      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{average_rating ? average_rating.toFixed(2) : '0.00'}</h3>
          <p style={styles.statLabel}>Средний рейтинг</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statNumber}>{total_evaluations}</h3>
          <p style={styles.statLabel}>Всего оценок</p>
        </div>
      </div>

      {evaluations.length === 0 ? (
        <p style={styles.noData}>Оценки пока отсутствуют</p>
      ) : (
        <div style={styles.evaluationsList}>
          <h3 style={styles.listTitle}>История оценок</h3>
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} style={styles.evaluationItem}>
              <div style={styles.evaluationHeader}>
                <span style={styles.rating}>
                  Оценка: <strong>{evaluation.rating}/5</strong>
                </span>
                <span style={styles.task}>
                  Задача: {evaluation.task?.title || "Неизвестная задача"}
                </span>
              </div>
              {evaluation.comment && (
                <p style={styles.comment}>
                  <strong>Комментарий:</strong> {evaluation.comment}
                </p>
              )}
              <div style={styles.evaluationFooter}>
                <span style={styles.evaluator}>
                  Оценщик: {evaluation.evaluator?.username || "Неизвестный пользователь"}
                </span>
                <span style={styles.date}>
                  {new Date(evaluation.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
  tabs: {
    display: "flex",
    marginBottom: "20px",
    borderBottom: "1px solid #ddd",
  },
  tab: {
    padding: "10px 20px",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    fontSize: "16px",
    color: "#666",
    transition: "all 0.3s ease",
  },
  activeTab: {
    padding: "10px 20px",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid #2196F3",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#2196F3",
  },
  profileInfo: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "5px",
    marginBottom: "20px",
    lineHeight: "1.6",
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
    color: "#333",
  },
  input: {
    width: "100%",
    padding: "8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "8px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "16px",
    resize: "vertical",
    minHeight: "100px",
    boxSizing: "border-box",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
    flexWrap: "wrap",
  },
  editButton: {
    padding: "10px 15px",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  saveButton: {
    padding: "10px 15px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  cancelButton: {
    padding: "10px 15px",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  logoutButton: {
    padding: "10px 15px",
    backgroundColor: "#ff9800",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  deleteButton: {
    padding: "10px 15px",
    backgroundColor: "#d32f2f",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  confirmDeleteButton: {
    padding: "10px 15px",
    backgroundColor: "#d32f2f",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  error: {
    color: "#d32f2f",
    backgroundColor: "#ffebee",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "20px",
    border: "1px solid #ffcdd2",
  },
  success: {
    color: "#2e7d32",
    backgroundColor: "#e8f5e9",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "20px",
    border: "1px solid #c8e6c9",
  },
  section: {
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "5px",
  },
  subtitle: {
    color: "#444",
    margin: "0 0 15px 0",
    paddingBottom: "10px",
    borderBottom: "1px solid #eee",
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
  loading: {
    textAlign: "center",
    padding: "40px",
    color: "#666",
  },
  evaluationsContainer: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "5px",
  },
  evaluationsHeader: {
    marginBottom: "20px",
  },
  refreshButton: {
    padding: "8px 16px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  statsContainer: {
    display: "flex",
    gap: "20px",
    marginBottom: "30px",
    flexWrap: "wrap",
  },
  statCard: {
    flex: "1",
    minWidth: "150px",
    padding: "20px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    textAlign: "center",
    border: "1px solid #e9ecef",
  },
  statNumber: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "0 0 10px 0",
    color: "#495057",
  },
  statLabel: {
    margin: 0,
    color: "#6c757d",
    fontSize: "14px",
  },
  evaluationsList: {
    marginTop: "20px",
  },
  listTitle: {
    color: "#495057",
    marginBottom: "15px",
    paddingBottom: "10px",
    borderBottom: "1px solid #dee2e6",
  },
  evaluationItem: {
    padding: "15px",
    marginBottom: "15px",
    border: "1px solid #dee2e6",
    borderRadius: "5px",
    backgroundColor: "#f8f9fa",
  },
  evaluationHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    flexWrap: "wrap",
    gap: "10px",
  },
  rating: {
    fontWeight: "bold",
    color: "#28a745",
    fontSize: "14px",
  },
  task: {
    color: "#495057",
    fontSize: "14px",
  },
  comment: {
    margin: "10px 0",
    padding: "10px",
    backgroundColor: "white",
    borderRadius: "4px",
    borderLeft: "3px solid #007bff",
    fontSize: "14px",
  },
  evaluationFooter: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "10px",
    fontSize: "12px",
    color: "#6c757d",
    flexWrap: "wrap",
    gap: "10px",
  },
  noData: {
    textAlign: "center",
    color: "#6c757d",
    padding: "40px",
    fontStyle: "italic",
  },
};