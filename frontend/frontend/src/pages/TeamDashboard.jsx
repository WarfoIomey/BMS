import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Plus, Trash2, Edit, Save, X, UserPlus, List } from "react-feather";

const TeamDashboard = () => {
  const { user: currentUser, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [newTeamTitle, setNewTeamTitle] = useState("");
  const [selectedUsers, setSelectedUsers] = useState({});
  const [editingRoles, setEditingRoles] = useState({});
  const [roleValues, setRoleValues] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (token) {
      fetchTeams();
      fetchUsers();
    } else {
      navigate("/login");
    }
  }, [token, navigate]);

  const fetchTeams = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/teams/", {
        headers: { Authorization: `Token ${token}` },
      });
      setTeams(res.data.results);
    } catch (err) {
      console.error("Ошибка загрузки команд", err.response?.data || err.message);
      setError("Не удалось загрузить команды");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/users/", {
        headers: { Authorization: `Token ${token}` },
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Ошибка загрузки пользователей", err.response?.data || err.message);
    }
  };

  const createTeam = async () => {
    if (!newTeamTitle.trim()) {
      setError("Введите название команды");
      return;
    }
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/teams/",
        { title: newTeamTitle },
        { headers: { Authorization: `Token ${token}` } }
      );
      setTeams([res.data, ...teams]);
      setNewTeamTitle("");
      setSuccess("Команда успешно создана");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Ошибка создания команды", err.response?.data || err.message);
      setError(err.response?.data?.title?.[0] || "Ошибка создания команды");
    }
  };

  const addParticipant = async (teamId) => {
    const userId = selectedUsers[teamId];
    if (!userId) {
      setError("Выберите пользователя");
      return;
    }
    try {
      await axios.put(
        `http://127.0.0.1:8000/api/teams/${teamId}/add-participant/`,
        { user_id: userId },
        { headers: { Authorization: `Token ${token}` } }
      );
      fetchTeams();
      setSelectedUsers((prev) => ({ ...prev, [teamId]: "" }));
      setSuccess("Участник добавлен");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Ошибка добавления участника", err.response?.data || err.message);
      setError("Не удалось добавить участника");
    }
  };

  const removeParticipant = async (teamId, userId) => {
    try {
      await axios.delete(
        `http://127.0.0.1:8000/api/teams/${teamId}/remove-participant/`,
        {
          data: { user_id: userId },
          headers: { Authorization: `Token ${token}` },
        }
      );
      fetchTeams();
      setSuccess("Участник удален");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Ошибка удаления участника", err.response?.data || err.message);
      setError("Не удалось удалить участника");
    }
  };

  const updateParticipantRole = async (teamId, userId) => {
    const newRole = roleValues[`${teamId}-${userId}`];
    if (!newRole) return;
    
    try {
      await axios.put(
        `http://127.0.0.1:8000/api/teams/${teamId}/change-role/`,
        { user_id: userId, role: newRole },
        { headers: { Authorization: `Token ${token}` } }
      );
      fetchTeams();
      setEditingRoles((prev) => ({ ...prev, [`${teamId}-${userId}`]: false }));
      setSuccess("Роль обновлена");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.role || 
                        err.response?.data?.detail || 
                        "Ошибка изменения роли";
      setError(errorMessage);
    }
  };

  const startEditingRole = (teamId, userId, currentRole) => {
    setEditingRoles((prev) => ({ ...prev, [`${teamId}-${userId}`]: true }));
    setRoleValues((prev) => ({ ...prev, [`${teamId}-${userId}`]: currentRole }));
    setError(null);
  };

  const cancelEditingRole = (teamId, userId) => {
    setEditingRoles((prev) => ({ ...prev, [`${teamId}-${userId}`]: false }));
  };

  const handleRoleChange = (teamId, userId, value) => {
    setRoleValues((prev) => ({ ...prev, [`${teamId}-${userId}`]: value }));
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin_team':
        return 'Администратор';
      case 'manager':
        return 'Менеджер';
      case 'user':
        return 'Пользователь';
      default:
        return role;
    }
  };

  const isCurrentUser = (participant) => currentUser.id === participant.id;
  const isAdmin = currentUser?.role === 'admin_team';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Управление командами</h2>
        {isAdmin && (
          <div style={styles.createTeamContainer}>
            <input
              type="text"
              placeholder="Название новой команды"
              value={newTeamTitle}
              onChange={(e) => {
                setNewTeamTitle(e.target.value);
                setError(null);
              }}
              style={styles.input}
            />
            <button 
              onClick={createTeam}
              style={styles.primaryButton}
            >
              <Plus size={16} style={{ marginRight: "8px" }} />
              Создать команду
            </button>
          </div>
        )}
      </div>

      {(error || success) && (
        <div style={{
          ...styles.alert,
          ...(error ? styles.errorAlert : styles.successAlert)
        }}>
          {error || success}
        </div>
      )}

      {teams.length === 0 ? (
        <div style={styles.emptyState}>
          <p>Команд пока нет</p>
          {isAdmin && (
            <button 
              onClick={createTeam}
              style={styles.primaryButton}
            >
              <Plus size={16} style={{ marginRight: "8px" }} />
              Создать первую команду
            </button>
          )}
        </div>
      ) : (
        <div style={styles.teamsContainer}>
          {teams.map((team) => (
            <div key={team.id} style={styles.teamCard}>
              <div style={styles.teamHeader}>
                <h3 style={styles.teamTitle}>{team.title}</h3>
                {isAdmin && (
                  <div style={styles.addParticipantContainer}>
                    <select
                      value={selectedUsers[team.id] || ""}
                      onChange={(e) => {
                        setSelectedUsers((prev) => ({
                          ...prev,
                          [team.id]: e.target.value,
                        }));
                        setError(null);
                      }}
                      style={styles.select}
                    >
                      <option value="">Выберите участника</option>
                      {users
                        .filter(u => !team.participants.some(p => p.id === u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.username} ({u.email})
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => addParticipant(team.id)}
                      style={styles.primaryButton}
                    >
                      <UserPlus size={16} style={{ marginRight: "8px" }} />
                      Добавить
                    </button>
                  </div>
                )}
              </div>
              <div style={styles.participantsContainer}>
                <h4 style={styles.participantsTitle}>Участники:</h4>
                <ul style={styles.participantsList}>
                  {team.participants.map((participant) => (
                    <li key={participant.id} style={styles.participantItem}>
                      <div style={styles.participantInfo}>
                        <div>
                          <strong>{participant.username}</strong>
                          <span style={styles.participantEmail}> ({participant.email})</span>
                        </div>
                        <div style={styles.participantRole}>
                          Роль: {getRoleDisplayName(participant.role)}
                        </div>
                      </div>

                      {isAdmin && !isCurrentUser(participant) && (
                        <div style={styles.participantActions}>
                          {editingRoles[`${team.id}-${participant.id}`] ? (
                            <div style={styles.roleEditContainer}>
                              <select
                                value={roleValues[`${team.id}-${participant.id}`] || participant.role}
                                onChange={(e) => handleRoleChange(team.id, participant.id, e.target.value)}
                                style={styles.select}
                              >
                                <option value="user">Пользователь</option>
                                <option value="manager">Менеджер</option>
                              </select>
                              <button
                                onClick={() => updateParticipantRole(team.id, participant.id)}
                                style={styles.saveButton}
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={() => cancelEditingRole(team.id, participant.id)}
                                style={styles.cancelButton}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditingRole(team.id, participant.id, participant.role)}
                              style={styles.editButton}
                            >
                              <Edit size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => removeParticipant(team.id, participant.id)}
                            style={styles.deleteButton}
                            title="Удалить из команды"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={styles.teamFooter}>
                <button 
                  onClick={() => navigate(`/tasks?team=${team.id}`)}
                  style={styles.tasksButton}
                >
                  <List size={16} style={{ marginRight: "8px" }} />
                  Просмотр задач
                </button>
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
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    marginBottom: "16px",
    color: "#333",
  },
  createTeamContainer: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    marginBottom: "16px",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    flex: "1",
    maxWidth: "300px",
  },
  select: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    minWidth: "200px",
  },
  primaryButton: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#4338ca",
    },
  },
  alert: {
    padding: "12px 16px",
    borderRadius: "6px",
    marginBottom: "16px",
    fontSize: "14px",
  },
  errorAlert: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "1px solid #fca5a5",
  },
  successAlert: {
    backgroundColor: "#dcfce7",
    color: "#16a34a",
    border: "1px solid #86efac",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    color: "#64748b",
  },
  teamsContainer: {
    display: "flex",
    gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
    gap: "20px",
  },
  teamCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "16px",
    backgroundColor: "white",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  teamFooter: {
    marginTop: "auto",
    paddingTop: "16px",
    borderTop: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "center",
  },
  
  tasksButton: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    backgroundColor: "#6366f1",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#4f46e5",
    },
  },
  teamHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "12px",
  },
  teamTitle: {
    fontSize: "18px",
    fontWeight: "600",
    margin: 0,
    color: "#1e293b",
  },
  addParticipantContainer: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  participantsContainer: {
    marginTop: "12px",
  },
  participantsTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#64748b",
    marginBottom: "8px",
  },
  participantsList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  participantItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #f1f5f9",
    ":lastChild": {
      borderBottom: "none",
    },
  },
  participantInfo: {
    flex: 1,
  },
  participantEmail: {
    color: "#64748b",
    fontSize: "13px",
  },
  participantRole: {
    fontSize: "13px",
    color: "#475569",
    marginTop: "4px",
  },
  participantActions: {
    display: "flex",
    gap: "8px",
  },
  roleEditContainer: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  editButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    backgroundColor: "#e0e7ff",
    color: "#4f46e5",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#c7d2fe",
    },
  },
  saveButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    backgroundColor: "#dcfce7",
    color: "#16a34a",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#bbf7d0",
    },
  },
  cancelButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#fecaca",
    },
  },
  deleteButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#fecaca",
    },
  },
};

export default TeamDashboard;