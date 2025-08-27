import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Plus, Trash2, Edit, Save, X, UserPlus, List, Calendar  } from "react-feather";

const TeamDashboard = () => {
  const { user: currentUser, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [newTeamTitle, setNewTeamTitle] = useState("");
  const [selectedUsers, setSelectedUsers] = useState({});
  const [selectedRoles, setSelectedRoles] = useState({});
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
      const res = await axios.get("/api/teams/", {
        headers: { Authorization: `Token ${token}` },
      });
      setTeams(res.data.results || res.data);
    } catch (err) {
      console.error("Ошибка загрузки команд", err.response?.data || err.message);
      setError("Не удалось загрузить команды");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("/api/users/", {
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
        "/api/teams/",
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
    const role = selectedRoles[teamId] || 'participant';
    
    if (!userId) {
      setError("Выберите пользователя");
      return;
    }
    try {
      await axios.put(
        `/api/teams/${teamId}/add-participant/`,
        { user_id: userId, role },
        { headers: { Authorization: `Token ${token}` } }
      );
      fetchTeams();
      setSelectedUsers((prev) => ({ ...prev, [teamId]: "" }));
      setSelectedRoles((prev) => ({ ...prev, [teamId]: "participant" }));
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
        `/api/teams/${teamId}/remove-participant/`,
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
        `/api/teams/${teamId}/change-role/`,
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
      case 'admin':
        return 'Администратор команды';
      case 'manager':
        return 'Менеджер';
      case 'participant':
        return 'Участник';
      default:
        return role;
    }
  };

  const isTeamAdmin = (team) => {
    const adminMember = team.participants?.find(p => p.role.toLowerCase() === 'admin');
    return adminMember?.user?.id === currentUser.id;
  };

  const canEditParticipant = (team, participant) => {
    if (!isTeamAdmin(team)) return false;
    if (participant.user.id === currentUser.id) return false;
    return true;
  };

  const canAddParticipants = (team) => {
    return isTeamAdmin(team);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Управление командами</h2>
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
        </div>
      ) : (
        <div style={styles.teamsContainer}>
          {teams.map((team) => {
            const userIsTeamAdmin = isTeamAdmin(team);
            const participants = team.participants || [];
            
            return (
              <div key={team.id} style={styles.teamCard}>
                <div style={styles.teamHeader}>
                  <h3 style={styles.teamTitle}>{team.title}</h3>
                  {userIsTeamAdmin && (
                    <span style={styles.adminBadge}>Администратор</span>
                  )}
                </div>
                
                {canAddParticipants(team) && (
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
                        .filter(u => !participants.some(p => p.user.id === u.id))
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.username} ({u.email})
                          </option>
                        ))}
                    </select>
                    <select
                      value={selectedRoles[team.id] || "participant"}
                      onChange={(e) => {
                        setSelectedRoles((prev) => ({
                          ...prev,
                          [team.id]: e.target.value,
                        }));
                      }}
                      style={styles.select}
                    >
                      <option value="participant">Участник</option>
                      <option value="manager">Менеджер</option>
                      <option value="admin">Администратор</option>
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
                
                <div style={styles.participantsContainer}>
                  <h4 style={styles.participantsTitle}>Участники:</h4>
                  <ul style={styles.participantsList}>
                    {participants.map((participant) => (
                      <li key={participant.user.id} style={styles.participantItem}>
                        <div style={styles.participantInfo}>
                          <div>
                            <strong>{participant.user.username}</strong>
                            <span style={styles.participantEmail}> ({participant.user.email})</span>
                          </div>
                          <div style={styles.participantRole}>
                            Роль: {getRoleDisplayName(participant.role)}
                            {participant.user.id === currentUser.id && " (Вы)"}
                            {participant.role === 'admin' && " 👑"}
                          </div>
                        </div>

                        {canEditParticipant(team, participant) && (
                          <div style={styles.participantActions}>
                            {editingRoles[`${team.id}-${participant.user.id}`] ? (
                              <div style={styles.roleEditContainer}>
                                <select
                                  value={roleValues[`${team.id}-${participant.user.id}`] || participant.role}
                                  onChange={(e) => handleRoleChange(team.id, participant.user.id, e.target.value)}
                                  style={styles.select}
                                >
                                  <option value="participant">Участник</option>
                                  <option value="manager">Менеджер</option>
                                  <option value="admin">Администратор</option>
                                </select>
                                <button
                                  onClick={() => updateParticipantRole(team.id, participant.user.id)}
                                  style={styles.saveButton}
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={() => cancelEditingRole(team.id, participant.user.id)}
                                  style={styles.cancelButton}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingRole(team.id, participant.user.id, participant.role)}
                                style={styles.editButton}
                              >
                                <Edit size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => removeParticipant(team.id, participant.user.id)}
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
                    Задачи
                  </button>
                  <div style={{ width: "8px" }}></div>
                  <button 
                    onClick={() => navigate(`/meetings?team=${team.id}`)}
                    style={styles.calendarButton}
                  >
                    <Calendar size={16} style={{ marginRight: "8px" }} />
                    Календарь
                  </button>
                </div>
              </div>
            );
          })}
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
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
    gap: "20px",
  },
  teamCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "16px",
    backgroundColor: "white",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
  },
  teamHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  teamTitle: {
    fontSize: "18px",
    fontWeight: "600",
    margin: 0,
    color: "#1e293b",
  },
  adminBadge: {
    backgroundColor: "#dcfce7",
    color: "#16a34a",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
  },
  addParticipantContainer: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  participantsContainer: {
    marginBottom: "16px",
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
  },
  teamFooter: {
    marginTop: "auto",
    paddingTop: "16px",
    borderTop: "1px solid #f1f5f9",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
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
  },
  calendarButton: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    backgroundColor: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
};

export default TeamDashboard;