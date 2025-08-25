import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Save, X, Calendar, Clock, Users } from "react-feather";

const MeetingForm = () => {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const teamId = new URLSearchParams(location.search).get("team");

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: "09:00",
    duration: 60,
    participants: []
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing] = useState(!!id);

  useEffect(() => {
    if (!teamId) {
      navigate("/teams");
      return;
    }

    const fetchData = async () => {
      try {
        // Загружаем участников ТОЛЬКО из своей команды
        const usersRes = await axios.get(`http://127.0.0.1:8000/api/users/team-users/`, {
          headers: { Authorization: `Token ${token}` },
        });
        
        const usersData = usersRes.data;
        setAvailableUsers(Array.isArray(usersData) ? usersData : []);

        // Если это редактирование, загружаем данные встречи
        if (id) {
          const meetingRes = await axios.get(`http://127.0.0.1:8000/api/meetings/${id}/`, {
            headers: { Authorization: `Token ${token}` },
          });
          const meeting = meetingRes.data;
          setFormData({
            date: meeting.date,
            time: meeting.time,
            duration: meeting.duration,
            participants: meeting.participants ? meeting.participants.map(p => p.id) : []
          });
        }
      } catch (err) {
        console.error("Ошибка загрузки данных", err);
        if (err.response?.status === 400) {
          setError("Вы не состоите в команде. Сначала присоединитесь к команде.");
        } else {
          setError("Не удалось загрузить данные пользователей");
        }
      }
    };

    fetchData();
  }, [id, teamId, token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'duration' ? parseInt(value) : value 
    }));
    if (error) setError(null);
  };

  const handleParticipantsChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ 
      ...prev, 
      participants: selectedOptions 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        await axios.put(
          `http://127.0.0.1:8000/api/meetings/${id}/`,
          formData,
          { headers: { Authorization: `Token ${token}` } }
        );
      } else {
        await axios.post(
          "http://127.0.0.1:8000/api/meetings/",
          formData,
          { headers: { Authorization: `Token ${token}` } }
        );
      }

      navigate(`/meetings?team=${teamId}`);
    } catch (err) {
      console.error("Ошибка сохранения встречи", err.response?.data || err);
      const errorData = err.response?.data;
      
      if (errorData) {
        const errorMessages = Object.values(errorData).flat().join(', ');
        setError(errorMessages);
      } else {
        setError("Не удалось сохранить встречу");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/meetings?team=${teamId}`);
  };

  // Фильтруем текущего пользователя из списка участников (опционально)
  const filteredUsers = availableUsers.filter(teamUser => teamUser.id !== user?.id);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {isEditing ? 'Редактирование встречи' : 'Создание новой встречи'}
          </h2>
          <button 
            onClick={handleCancel}
            style={styles.closeButton}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Calendar size={16} style={styles.icon} />
              Дата встречи *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Clock size={16} style={styles.icon} />
                Время начала *
              </label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                <Clock size={16} style={styles.icon} />
                Длительность (минуты) *
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                style={styles.input}
                min="15"
                max="240"
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              <Users size={16} style={styles.icon} />
              Участники (только члены вашей команды) *
            </label>
            <select
              multiple
              value={formData.participants}
              onChange={handleParticipantsChange}
              style={{ ...styles.input, ...styles.participantsSelect }}
              required
            >
              {Array.isArray(filteredUsers) && filteredUsers.map(teamUser => (
                <option key={teamUser.id} value={teamUser.id}>
                  {teamUser.username} ({teamUser.email})
                </option>
              ))}
            </select>
            <small style={styles.helpText}>
              Удерживайте Ctrl (Cmd на Mac) для выбора нескольких участников
            </small>
            {filteredUsers.length === 0 && (
              <small style={styles.warningText}>
                В вашей команде нет других участников
              </small>
            )}
          </div>

          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleCancel}
              style={styles.cancelButton}
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading || filteredUsers.length === 0}
            >
              {loading ? 'Сохранение...' : (
                <>
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {isEditing ? 'Сохранить' : 'Создать встречу'}
                </>
              )}
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
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    padding: "32px",
    width: "100%",
    maxWidth: "600px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    color: "#333",
    fontWeight: "600",
  },
  closeButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#666",
    padding: "4px",
  },
  errorAlert: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    padding: "12px 16px",
    borderRadius: "6px",
    marginBottom: "24px",
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
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
    fontSize: "14px",
    fontWeight: "500",
    color: "#555",
  },
  icon: {
    marginRight: "8px",
    color: "#666",
  },
  input: {
    padding: "12px 16px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "16px",
    transition: "border-color 0.3s",
  },
  participantsSelect: {
    height: "120px",
  },
  helpText: {
    fontSize: "12px",
    color: "#666",
    marginTop: "4px",
  },
  buttonGroup: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    marginTop: "24px",
  },
  cancelButton: {
    padding: "12px 24px",
    backgroundColor: "#f8fafc",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  submitButton: {
    display: "flex",
    alignItems: "center",
    padding: "12px 24px",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  warningText: {
    fontSize: "12px",
    color: "#dc2626",
    marginTop: "4px",
    display: "block",
  },
};

export default MeetingForm;