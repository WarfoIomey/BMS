import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";

const TeamDashboard = () => {
  const { user: currentUser, token } = useContext(AuthContext);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [newTeamTitle, setNewTeamTitle] = useState("");
  const [selectedUsers, setSelectedUsers] = useState({});
  const [editingRoles, setEditingRoles] = useState({});
  const [roleValues, setRoleValues] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) {
      fetchTeams();
      fetchUsers();
    }
  }, [token]);

  const fetchTeams = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/teams/", {
        headers: { Authorization: `Token ${token}` },
      });
      setTeams(res.data.results);
    } catch (err) {
      console.error("Ошибка загрузки команд", err.response?.data || err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/users/", {
        headers: { Authorization: `Token ${token}` },
      });
      setUsers(res.data.results);
    } catch (err) {
      console.error("Ошибка загрузки пользователей", err.response?.data || err.message);
    }
  };

  const createTeam = async () => {
    if (!newTeamTitle.trim()) return;
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/teams/",
        { title: newTeamTitle },
        { headers: { Authorization: `Token ${token}` } }
      );
      setTeams([res.data, ...teams]);
      setNewTeamTitle("");
    } catch (err) {
      console.error("Ошибка создания команды", err.response?.data || err.message);
    }
  };

  const addParticipant = async (teamId) => {
    const userId = selectedUsers[teamId];
    if (!userId) return;
    try {
      await axios.put(
        `http://127.0.0.1:8000/api/teams/${teamId}/add-participant/`,
        { user_id: userId },
        { headers: { Authorization: `Token ${token}` } }
      );
      fetchTeams();
      setSelectedUsers((prev) => ({ ...prev, [teamId]: "" }));
    } catch (err) {
      console.error("Ошибка добавления участника", err.response?.data || err.message);
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
        `http://127.0.0.1:8000/api/teams/${teamId}/update-role/`,
        { user_id: userId, role: newRole },
        { headers: { Authorization: `Token ${token}` } }
      );
      fetchTeams();
      setEditingRoles((prev) => ({ ...prev, [`${teamId}-${userId}`]: false }));
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.role || 
                          err.response?.data?.detail || 
                          "Ошибка изменения роли";
      setError(errorMessage);
      console.error("Ошибка изменения роли", err.response?.data || err.message);
    }
  };

  const startEditingRole = (teamId, userId, currentRole) => {
    setEditingRoles((prev) => ({ ...prev, [`${teamId}-${userId}`]: true }));
    setRoleValues((prev) => ({ ...prev, [`${teamId}-${userId}`]: currentRole }));
    setError(null);
  };

  const cancelEditingRole = (teamId, userId) => {
    setEditingRoles((prev) => ({ ...prev, [`${teamId}-${userId}`]: false }));
    setError(null);
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

  const isCurrentUser = (participant) => {
    return currentUser.id === participant.id;
  };

  const isAdmin = currentUser?.role === 'admin_team';

  return (
    <div style={{ padding: "20px" }}>
      <h2>Список команд</h2>
      {error && <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>}

      {isAdmin && (
        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Название команды"
            value={newTeamTitle}
            onChange={(e) => setNewTeamTitle(e.target.value)}
            style={{ padding: "5px", marginRight: "10px" }}
          />
          <button onClick={createTeam}>Создать команду</button>
        </div>
      )}

      {Array.isArray(teams) && teams.length > 0 ? (
        teams.map((team) => (
          <div
            key={team.id}
            style={{
              border: "1px solid #ccc",
              borderRadius: "10px",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <h3>{team.title}</h3>
            <div>
              <strong>Участники:</strong>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {team.participants.map((participant) => (
                  <li 
                    key={participant.id} 
                    style={{ 
                      marginBottom: "8px", 
                      display: "flex", 
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ marginRight: "10px" }}>
                        {participant.username} ({participant.email})
                      </span>
                      <span style={{ minWidth: "100px" }}>
                        Роль: {getRoleDisplayName(participant.role)}
                      </span>
                    </div>

                    {isAdmin && !isCurrentUser(participant) && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        {editingRoles[`${team.id}-${participant.id}`] ? (
                          <>
                            <select
                              value={roleValues[`${team.id}-${participant.id}`] || participant.role}
                              onChange={(e) => handleRoleChange(team.id, participant.id, e.target.value)}
                              style={{ marginRight: "10px" }}
                            >
                              <option value="user">Пользователь</option>
                              <option value="manager">Менеджер</option>
                            </select>
                            <button
                              onClick={() => updateParticipantRole(team.id, participant.id)}
                              style={{ marginRight: "5px" }}
                            >
                              Сохранить
                            </button>
                            <button
                              onClick={() => cancelEditingRole(team.id, participant.id)}
                            >
                              Отмена
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditingRole(team.id, participant.id, participant.role)}
                            style={{ marginRight: "10px" }}
                          >
                            Изменить роль
                          </button>
                        )}
                        <button
                          onClick={() => removeParticipant(team.id, participant.id)}
                          style={{ color: "red" }}
                        >
                          Удалить
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {isAdmin && (
              <div style={{ marginTop: "10px" }}>
                <select
                  value={selectedUsers[team.id] || ""}
                  onChange={(e) =>
                    setSelectedUsers((prev) => ({
                      ...prev,
                      [team.id]: e.target.value,
                    }))
                  }
                  style={{ padding: "5px", marginRight: "10px" }}
                >
                  <option value="">Выберите пользователя для добавления</option>
                  {users
                    .filter(u => !team.participants.some(p => p.id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email})
                      </option>
                    ))}
                </select>
                <button onClick={() => addParticipant(team.id)}>Добавить</button>
              </div>
            )}
          </div>
        ))
      ) : (
        <p>Команд пока нет.</p>
      )}
    </div>
  );
};

export default TeamDashboard;