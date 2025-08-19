import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Circle, CheckCircle, RefreshCw, MoreHorizontal, Edit } from "react-feather";
import ErrorModal from './ErrorModal';

const TaskPage = () => {
  const { token, user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const canCreateTask = ['manager', 'admin_team'].includes(user?.role);
  const [filters, setFilters] = useState({
  executor: '',
  author: '',
  priority: '',
  status: '',
  deadline: '',
  search: ''
});

  const teamId = new URLSearchParams(location.search).get("team");

  useEffect(() => {
    if (!teamId) {
      navigate("/teams");
      return;
    }

    const fetchTasks = async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/api/tasks/?team=${teamId}`, {
          headers: { Authorization: `Token ${token}` },
        });
        setTasks(res.data.results);
      } catch (err) {
        console.error("Ошибка загрузки задач", err);
        handleError("Не удалось загрузить задачи");
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [teamId, token, navigate]);

  const handleDragStart = (task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === newStatus) return;

    try {
      await axios.put(
        `http://127.0.0.1:8000/api/tasks/${draggedTask.id}/update_status/`,
        { status: newStatus },
        { headers: { Authorization: `Token ${token}` } }
      );

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === draggedTask.id ? { ...task, status: newStatus } : task
        )
      );
    } catch (err) {
      console.error("Ошибка изменения статуса", err);
      handleError("Не удалось изменить статус задачи");
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <Circle size={16} />;
      case 'progress': return <RefreshCw size={16} />;
      case 'completed': return <CheckCircle size={16} />;
      default: return <MoreHorizontal size={16} />;
    }
  };
 const handleError = (message) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };
const filteredTasks = (status) => {
  return tasks.filter(task => {
    const matchesStatus = task.status === status;
    const matchesExecutor = !filters.executor || 
      (task.executor && task.executor.id.toString() === filters.executor);
    const matchesAuthor = !filters.author || 
      task.author.id.toString() === filters.author;
    const matchesPriority = !filters.priority || 
      task.priority === filters.priority;
    const matchesSearch = !filters.search || 
      task.title.toLowerCase().includes(filters.search.toLowerCase()) || 
      task.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDeadline = !filters.deadline || (
      task.deadline && (
        (filters.deadline === 'overdue' && new Date(task.deadline) < new Date()) ||
        (filters.deadline === 'today' && 
          new Date(task.deadline).toDateString() === new Date().toDateString()) ||
        (filters.deadline === 'future' && 
          new Date(task.deadline) > new Date())
      )
    );
    
    return matchesStatus && matchesExecutor && matchesAuthor && 
           matchesPriority && matchesSearch && matchesDeadline;
  });
};
const resetFilters = () => {
  setFilters({
    executor: '',
    author: '',
    priority: '',
    status: '',
    deadline: '',
    search: ''
  });
};

  if (loading) return <div style={styles.loading}>Загрузка...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Доска задач команды</h2>
        {canCreateTask && (
          <button 
            onClick={() => navigate(`/tasks/create?team=${teamId}`)}
            style={styles.createButton}
          >
            Создать задачу
          </button>
        )}
      </div>
      <div style={styles.filterContainer}>
        <input
          type="text"
          placeholder="Поиск по названию или описанию"
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          style={styles.searchInput}
        />
        
        <select
          value={filters.executor}
          onChange={(e) => setFilters({...filters, executor: e.target.value})}
          style={styles.filterSelect}
        >
          <option value="">Все исполнители</option>
          {Array.from(new Set(tasks.map(t => t.executor?.id).filter(Boolean))).map(id => {
            const executor = tasks.find(t => t.executor?.id === id)?.executor;
            return executor && (
              <option key={id} value={id}>{executor.username}</option>
            );
          })}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          style={styles.filterSelect}
        >
          <option value="">Все статусы</option>
          <option value="open">Новые</option>
          <option value="progress">В работе</option>
          <option value="completed">Завершенные</option>
        </select>
        <select
          value={filters.deadline}
          onChange={(e) => setFilters({...filters, deadline: e.target.value})}
          style={styles.filterSelect}
        >
          <option value="">Все сроки</option>
          <option value="overdue">Просроченные</option>
          <option value="today">На сегодня</option>
          <option value="future">Предстоящие</option>
        </select>
        <button 
          onClick={resetFilters}
          style={styles.resetButton}
          title="Сбросить все фильтры"
        >
          Сбросить
        </button>
      </div>
      <div style={styles.board}>
        {['open', 'progress', 'completed'].map((status) => (
          <div 
            key={status}
            style={styles.column}
            onDragOver={(e) => handleDragOver(e, status)}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div style={styles.columnHeader}>
              {getStatusIcon(status)}
              <h3 style={styles.columnTitle}>
                {status === 'open' && 'Новые'}
                {status === 'progress' && 'В работе'}
                {status === 'completed' && 'Завершенные'}
              </h3>
              <span style={styles.taskCount}>{filteredTasks(status).length}</span>
            </div>

            <div style={styles.taskList}>
              {filteredTasks(status).map((task) => (
                <div
                  key={task.id}
                  style={styles.taskCard}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <div style={styles.taskHeader}>
                    <h4 style={styles.taskTitle}>{task.title}</h4>
                    {user.id === task.author.id && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${task.id}/edit`);
                        }}
                        style={styles.editButton}
                      >
                        <Edit size={14} />
                      </button>
                    )}
                  </div>
                  
                  <p style={styles.taskDescription}>
                    {task.description.length > 100
                      ? `${task.description.substring(0, 100)}...`
                      : task.description}
                  </p>
                  
                  <div style={styles.taskFooter}>
                    <span style={styles.executor}>
                      {task.executor ? task.executor.username : 'Не назначен'}
                    </span>
                    <span style={styles.statusBadge}>
                      {getStatusIcon(task.status)}
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {showErrorModal && (
        <ErrorModal 
          message={errorMessage}
          onClose={closeErrorModal}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: "24px",
    maxWidth: "1400px",
    margin: "0 auto",
    minHeight: "calc(100vh - 48px)",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    fontSize: "18px",
  },
  error: {
    textAlign: "center",
    padding: "40px",
    color: "#dc2626",
    fontSize: "18px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  createButton: {
    padding: "10px 16px",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    ":hover": {
      backgroundColor: "#4338ca",
    },
  },
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    height: "100%",
  },
  column: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "16px",
    minHeight: "600px",
    border: "1px solid #e2e8f0",
  },
  columnHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e2e8f0",
  },
  columnTitle: {
    margin: "0 8px",
    fontSize: "16px",
    fontWeight: "600",
  },
  taskCount: {
    backgroundColor: "#e2e8f0",
    borderRadius: "12px",
    padding: "2px 8px",
    fontSize: "12px",
    fontWeight: "500",
  },
  taskList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  taskCard: {
    backgroundColor: "white",
    borderRadius: "6px",
    padding: "16px",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "all 0.2s",
    ":hover": {
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
      transform: "translateY(-2px)",
    },
  },
  taskHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "8px",
  },
  taskTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "600",
    color: "#1e293b",
  },
  editButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
    ":hover": {
      color: "#4f46e5",
    },
  },
  taskDescription: {
    margin: "8px 0",
    fontSize: "14px",
    color: "#475569",
    lineHeight: "1.4",
  },
  taskFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "12px",
    fontSize: "13px",
  },
  executor: {
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    padding: "4px 8px",
    borderRadius: "4px",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "#64748b",
  },
  filterContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: '15px',
    borderRadius: '8px',
  },

  searchInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    flex: '1',
    minWidth: '200px',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minWidth: '150px',
    maxWidth: '200px',
  },
  resetButton: {
    padding: '8px 16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    color: '#64748b',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f1f5f9',
      color: '#475569',
    },
  },
};

export default TaskPage;