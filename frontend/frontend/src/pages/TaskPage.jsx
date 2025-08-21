import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Circle, CheckCircle, RefreshCw, MoreHorizontal, Edit, Star } from "react-feather";
import ErrorModal from './ErrorModal';

const TaskPage = () => {
  const { token, user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef();
  const lastTaskElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchTasks(true);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const canCreateTask = ['manager', 'admin_team'].includes(user?.role);
  const [filters, setFilters] = useState({
    executor: '',
    author: '',
    status: '',
    deadline: '',
    search: ''
  });

  const teamId = new URLSearchParams(location.search).get("team");
  const limit = 20;
  const offsetRef = useRef(0);

  const fetchTasks = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        offsetRef.current = 0;
        setTasks([]);
        setHasMore(true);
      }

      const params = new URLSearchParams({
        team: teamId,
        limit: limit,
        offset: offsetRef.current
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const res = await axios.get(`http://127.0.0.1:8000/api/tasks/?${params}`, {
        headers: { Authorization: `Token ${token}` },
      });

      if (loadMore) {
        setTasks(prevTasks => [...prevTasks, ...res.data]);
      } else {
        setTasks(res.data);
      }

      offsetRef.current += res.data.length;
      setHasMore(res.data.length === limit);
    } catch (err) {
      console.error("Ошибка загрузки задач", err);
      handleError("Не удалось загрузить задачи");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
  const rateTask = async (taskId, rating) => {
    try {
      const taskToRate = tasks.find(task => task.id === taskId);
      if (user.id !== taskToRate.author.id) {
        handleError("Только автор задачи может её оценивать");
        return;
      }
      await axios.post(
        `http://127.0.0.1:8000/api/tasks/${taskId}/evaluate/`,
        { rating: rating },
        { headers: { Authorization: `Token ${token}` } }
      );
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { 
                ...task, 
                author_rating: rating,
              } 
            : task
        )
      );
    } catch (err) {
      console.error("Ошибка оценки задачи", err);
      if (err.response?.status === 403) {
        handleError("Только автор задачи может её оценивать");
      } else {
        handleError("Не удалось оценить задачу");
      }
    }
  };
  useEffect(() => {
    if (!teamId) {
      navigate("/teams");
      return;
    }
    fetchTasks(false);
  }, [teamId, token, navigate]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTasks(false);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

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
  const renderRatingStars = (task) => {
  if (task.status !== 'completed') return null;

  const isAuthor = user.id === task.author.id;
  const canRate = isAuthor && !task.author_rating;

  return (
    <div style={styles.ratingContainer} onClick={(e) => e.stopPropagation()}>
      {canRate && (
        <div style={styles.ratingButtons}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={(e) => {
                e.stopPropagation();
                rateTask(task.id, star);
              }}
              style={styles.starButton}
              title={`Оценить на ${star}`}
            >
              <Star size={14} />
              {star}
            </button>
          ))}
        </div>
      )}
      {task.author_rating && (
        <div style={styles.userRating}>
          <span style={styles.userRatingText}>
            {isAuthor ? "Ваша оценка: " : "Оценка автора: "}
            {task.author_rating}
            <Star size={12} fill="#fbbf24" color="#fbbf24" />
          </span>
        </div>
      )}
      {!task.author_rating && isAuthor && (
        <div style={styles.ratingInfo}>
          <span style={styles.ratingInfoText}>
            Вы можете оценить эту задачу
          </span>
        </div>
      )}
      {!task.author_rating && !isAuthor && (
        <div style={styles.ratingInfo}>
          <span style={styles.ratingInfoText}>
            Автор ещё не оценил эту задачу
          </span>
        </div>
      )}
    </div>
  );
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
    return tasks.filter(task => task.status === status);
  };

  const resetFilters = () => {
    setFilters({
      executor: '',
      author: '',
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
              {filteredTasks(status).map((task, index) => {
                const isLastElement = filteredTasks(status).length === index + 1 && hasMore;
                
                return (
                  <div
                    ref={isLastElement ? lastTaskElementRef : null}
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
                            navigate(`/tasks/${task.id}/edit?team=${task.team.id}`);
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
                    
                    {task.status === 'completed' && renderRatingStars(task)}
                    
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
                );
              })}
              {loadingMore && (
                <div style={styles.loadingMore}>Загрузка...</div>
              )}
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
  loadingMore: {
    textAlign: "center",
    padding: "20px",
    fontSize: "14px",
    color: "#64748b",
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
  },
  board: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    minHeight: "600px",
  },
  column: {
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid #e2e8f0",
    maxHeight: "80vh",
    overflowY: "auto",
  },
  columnHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    backgroundColor: "#f8fafc",
    zIndex: 1,
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
  },
    ratingContainer: {
    margin: '8px 0',
    padding: '8px',
    backgroundColor: '#f8fafc',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
  },
  
  averageRating: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '6px',
    fontSize: '12px',
    color: '#475569',
  },
  
  ratingText: {
    fontWeight: '600',
    color: '#1e293b',
  },
  
  ratingCount: {
    color: '#64748b',
    fontSize: '11px',
  },
  
  ratingButtons: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  
  starButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    padding: '4px 6px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '11px',
    transition: 'all 0.2s',
  },
  
  starButtonHover: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  
  userRating: {
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid #e2e8f0',
  },
  
  userRatingText: {
    fontSize: '11px',
    color: '#059669',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
    ratingInfo: {
    marginTop: '6px',
    paddingTop: '6px',
    borderTop: '1px solid #e2e8f0',
  },
  ratingInfoText: {
    fontSize: '11px',
    color: '#64748b',
    fontStyle: 'italic',
  },
};

// Добавляем hover-эффекты через CSS-in-JS
const hoverStyles = {
  createButtonHover: {
    backgroundColor: "#4338ca",
  },
  editButtonHover: {
    color: "#4f46e5",
  },
  resetButtonHover: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
  },
  taskCardHover: {
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    transform: "translateY(-2px)",
  },
  starButtonHover: {
    backgroundColor: "#fef3c7",
    borderColor: "#fbbf24",
  }
};

export default TaskPage;