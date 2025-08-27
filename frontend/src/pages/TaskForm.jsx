import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Save, X, Calendar, User } from "react-feather";

const TaskForm = () => {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const teamId = new URLSearchParams(location.search).get("team");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadline: "",
    executor_id: "",
    status: "open"
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing] = useState(!!id);
  const filteredUsers = users.filter(participant => 
    participant.user.id !== user.id
  );

  useEffect(() => {
    if (!teamId && !id) { 
      navigate("/teams");
      return;
    }

    const fetchData = async () => {
      try {
        if (teamId) {
          const usersRes = await axios.get(`/api/teams/${teamId}/`, {
            headers: { Authorization: `Token ${token}` },
          });
          setUsers(usersRes.data.participants || []);
        }
        
        if (id) {
          const taskRes = await axios.get(`/api/tasks/${id}/`, {
            headers: { Authorization: `Token ${token}` },
          });
          const task = taskRes.data;
          setFormData({
            title: task.title,
            description: task.description,
            deadline: task.deadline ? task.deadline.split('T')[0] : "",
            executor_id: task.executor?.id || "",
            status: task.status
          });
          if (task.team?.id) {
            const teamUsersRes = await axios.get(`/api/teams/${task.team.id}/`, {
              headers: { Authorization: `Token ${token}` },
            });
            setUsers(teamUsersRes.data.participants || []);
          }
        }
      } catch (err) {
        console.error("Ошибка загрузки данных", err);
        setError("Не удалось загрузить данные");
      }
    };

    fetchData();
  }, [id, teamId, token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline || null,
        executor_id: formData.executor_id || null,
        status: formData.status
      };

      if (teamId) {
        payload.team_id = parseInt(teamId);
      }

      if (isEditing) {
        await axios.put(
          `/api/tasks/${id}/`,
          payload,
          { headers: { Authorization: `Token ${token}` } }
        );
      } else {
        await axios.post(
          "/api/tasks/",
          payload,
          { headers: { Authorization: `Token ${token}` } }
        );
      }

      navigate(`/tasks?team=${teamId}`);
    } catch (err) {
      console.error("Ошибка сохранения задачи", err.response?.data || err);
      const errorData = err.response?.data;
      
      if (errorData) {
        const errorMessages = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        setError(errorMessages);
      } else {
        setError("Не удалось сохранить задачу");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/tasks?team=${teamId}`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {isEditing ? 'Редактирование задачи' : 'Создание новой задачи'}
        </h2>

        {error && (
          <div style={styles.errorAlert}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Название задачи *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              style={styles.input}
              placeholder="Введите название задачи"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Описание</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              style={styles.textarea}
              placeholder="Опишите детали задачи"
              rows="5"
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Calendar size={16} style={styles.icon} />
                Дедлайн
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                style={styles.input}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <User size={16} style={styles.icon} />
                Исполнитель
              </label>
              <select
                name="executor_id"
                value={formData.executor_id}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="">Не назначен</option>
                {filteredUsers.map((participant) => (
                  <option key={participant.user.id} value={participant.user.id}>
                    {participant.user.username} ({participant.user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isEditing && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Статус</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={styles.select}
              >
                <option value="open">Новая</option>
                <option value="progress">В работе</option>
                <option value="closed">Завершена</option>
              </select>
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleCancel}
              style={styles.cancelButton}
              disabled={loading}
            >
              <X size={16} style={{ marginRight: "8px" }} />
              Отмена
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading}
            >
              <Save size={16} style={{ marginRight: "8px" }} />
              {loading ? 'Сохранение...' : (isEditing ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    minHeight: "100vh",
    padding: "24px",
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    padding: "32px",
    width: "100%",
    maxWidth: "600px",
  },
  title: {
    textAlign: "center",
    marginBottom: "24px",
    color: "#333",
    fontSize: "24px",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#555",
  },
  icon: {
    color: "#666",
  },
  input: {
    padding: "12px 16px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "16px",
    transition: "border-color 0.3s",
  },
  textarea: {
    padding: "12px 16px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "16px",
    resize: "vertical",
    minHeight: "100px",
    fontFamily: "inherit",
  },
  select: {
    padding: "12px 16px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "16px",
    backgroundColor: "white",
  },
  errorAlert: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "6px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    marginTop: "24px",
  },
  cancelButton: {
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    backgroundColor: "#f8fafc",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  submitButton: {
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
};

Object.assign(styles.cancelButton, {
  ':hover': {
    backgroundColor: "#f1f5f9",
  }
});

Object.assign(styles.submitButton, {
  ':hover': {
    backgroundColor: "#4338ca",
  },
  ':disabled': {
    backgroundColor: "#9ca3af",
    cursor: "not-allowed",
  }
});

export default TaskForm;