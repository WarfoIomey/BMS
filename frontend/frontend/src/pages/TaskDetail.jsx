import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  User, 
  Flag, 
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  MessageCircle,
  Send
} from "react-feather";

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  
  // Состояния для комментариев
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/api/tasks/${id}/`, {
          headers: { Authorization: `Token ${token}` },
        });
        setTask(response.data);
      } catch (err) {
        console.error("Ошибка загрузки задачи", err);
        setError("Не удалось загрузить задачу");
      } finally {
        setLoading(false);
      }
    };

    const fetchComments = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/api/tasks/${id}/comments/`, {
          headers: { Authorization: `Token ${token}` },
        });
        setComments(response.data);
      } catch (err) {
        console.error("Ошибка загрузки комментариев", err);
      } finally {
        setLoadingComments(false);
      }
    };

    fetchTask();
    fetchComments();
  }, [id, token]);

  const handleStatusChange = async (newStatus) => {
    if (!task || task.status === newStatus) return;

    setIsChangingStatus(true);
    try {
      await axios.put(
        `http://127.0.0.1:8000/api/tasks/${id}/update_status/`,
        { status: newStatus },
        { headers: { Authorization: `Token ${token}` } }
      );
      console.log('Ответ от сервера:', response.data); // ← ДОБАВЬТЕ ЭТО
      console.log('Автор:', response.data.author);
      setTask(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error("Ошибка изменения статуса", err);
      setError("Не удалось изменить статус задачи");
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleSendComment = async (e) => {
  e.preventDefault();
  if (!newComment.trim() || sendingComment) return;

  setSendingComment(true);
  try {
    const response = await axios.post(
      `http://127.0.0.1:8000/api/tasks/${id}/comments/`,
      { text: newComment },
      { 
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    setComments(prev => [response.data, ...prev]);
    setNewComment("");
  } catch (err) {
    console.error("Ошибка отправки комментария", err);
    if (err.response?.data) {
      alert(err.response.data.text || "Не удалось отправить комментарий");
    } else {
      alert("Не удалось отправить комментарий");
    }
  } finally {
    setSendingComment(false);
  }
};

  const getStatusInfo = (status) => {
    switch (status) {
      case 'open':
        return { color: '#3b82f6', icon: <Clock size={16} />, label: 'Новая' };
      case 'progress':
        return { color: '#f59e0b', icon: <AlertCircle size={16} />, label: 'В работе' };
      case 'completed':
        return { color: '#10b981', icon: <CheckCircle size={16} />, label: 'Завершена' };
      default:
        return { color: '#6b7280', icon: <Clock size={16} />, label: status };
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEdit = user?.id === task?.author?.id;
  const canChangeStatus = user?.role === 'manager' || user?.role === 'admin_team' || user?.id === task?.executor?.id;
  const canComment = user?.id === task?.author?.id || user?.id === task?.executor?.id || user?.role === 'manager' || user?.role === 'admin_team';

  if (loading) return <div style={styles.loading}>Загрузка...</div>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!task) return <div style={styles.error}>Задача не найдена</div>;

  const statusInfo = getStatusInfo(task.status);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button 
          onClick={() => navigate(-1)}
          style={styles.backButton}
        >
          <ArrowLeft size={20} />
          Назад
        </button>
        
        <div style={styles.headerActions}>
          {canEdit && (
            <button 
              onClick={() => navigate(`/tasks/${id}/edit?team=${task.team.id}`)}
              style={styles.editButton}
            >
              <Edit size={16} />
              Редактировать
            </button>
          )}
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.mainSection}>
          <div style={styles.taskHeader}>
            <h1 style={styles.title}>{task.title}</h1>
            <div style={{ ...styles.statusBadge, backgroundColor: `${statusInfo.color}20`, color: statusInfo.color }}>
              {statusInfo.icon}
              {statusInfo.label}
            </div>
          </div>

          <div style={styles.descriptionSection}>
            <h3 style={styles.sectionTitle}>
              <FileText size={18} />
              Описание
            </h3>
            <p style={styles.description}>
              {task.description || "Описание отсутствует"}
            </p>
          </div>

          {task.deadline && (
            <div style={styles.deadlineSection}>
              <h3 style={styles.sectionTitle}>
                <Calendar size={18} />
                Дедлайн
              </h3>
              <div style={styles.deadline}>
                {new Date(task.deadline).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                {new Date(task.deadline) < new Date() && task.status !== 'completed' && (
                  <span style={styles.overdue}> (Просрочено)</span>
                )}
              </div>
            </div>
          )}

          {/* Секция комментариев */}
          <div style={styles.commentsSection}>
            <h3 style={styles.sectionTitle}>
              <MessageCircle size={18} />
              Комментарии ({comments.length})
            </h3>

            {canComment && (
              <form onSubmit={handleSendComment} style={styles.commentForm}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Напишите комментарий..."
                  style={styles.commentInput}
                  rows={3}
                  disabled={sendingComment}
                />
                <button 
                  type="submit" 
                  style={styles.sendButton}
                  disabled={!newComment.trim() || sendingComment}
                >
                  <Send size={16} />
                  {sendingComment ? "Отправка..." : "Отправить"}
                </button>
              </form>
            )}

            {loadingComments ? (
              <div style={styles.loadingComments}>Загрузка комментариев...</div>
            ) : comments.length === 0 ? (
              <div style={styles.noComments}>Комментариев пока нет</div>
            ) : (
              <div style={styles.commentsList}>
                {comments.map((comment) => (
                  <div key={comment.id} style={styles.commentItem}>
                    <div style={styles.commentHeader}>
                      <div style={styles.commentAuthor}>
                        <User size={14} />
                        {comment.author.username}
                      </div>
                      <div style={styles.commentTime}>
                        {formatDateTime(comment.created_at)}
                      </div>
                    </div>
                    <div style={styles.commentText}>
                      {comment.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.infoCard}>
            <h3 style={styles.sidebarTitle}>Информация о задаче</h3>
            
            <div style={styles.infoItem}>
              <User size={16} />
              <span style={styles.infoLabel}>Автор:</span>
              <span style={styles.infoValue}>{task.author.username}</span>
            </div>

            <div style={styles.infoItem}>
              <User size={16} />
              <span style={styles.infoLabel}>Исполнитель:</span>
              <span style={styles.infoValue}>
                {task.executor ? task.executor.username : 'Не назначен'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <Calendar size={16} />
              <span style={styles.infoLabel}>Создана:</span>
              <span style={styles.infoValue}>
                {new Date(task.deadline + "T00:00:00").toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div style={styles.infoItem}>
              <Flag size={16} />
              <span style={styles.infoLabel}>Оценка:</span>
              <span style={styles.infoValue}>
                {task.author_rating
                  ? `${task.author_rating}/5 (автор)`
                  : "Автор ещё не оценил"}
              </span>
            </div>
          </div>

          {canChangeStatus && (
            <div style={styles.statusCard}>
              <h3 style={styles.sidebarTitle}>Изменить статус</h3>
              <div style={styles.statusButtons}>
                {task.status !== 'open' && (
                  <button
                    onClick={() => handleStatusChange('open')}
                    disabled={isChangingStatus}
                    style={styles.statusButton}
                  >
                    Открыть заново
                  </button>
                )}
                {task.status !== 'progress' && (
                  <button
                    onClick={() => handleStatusChange('progress')}
                    disabled={isChangingStatus}
                    style={styles.statusButton}
                  >
                    В работу
                  </button>
                )}
                {task.status !== 'completed' && (
                  <button
                    onClick={() => handleStatusChange('completed')}
                    disabled={isChangingStatus}
                    style={styles.statusButton}
                  >
                    Завершить
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
    minHeight: "100vh",
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
    marginBottom: "32px",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#64748b",
    ":hover": {
      backgroundColor: "#f1f5f9",
    },
  },
  headerActions: {
    display: "flex",
    gap: "12px",
  },
  editButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    ":hover": {
      backgroundColor: "#4338ca",
    },
  },
  content: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "32px",
  },
  mainSection: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  taskHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#1e293b",
    margin: 0,
    flex: 1,
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "500",
  },
  descriptionSection: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    margin: "0 0 16px 0",
    fontSize: "18px",
    fontWeight: "600",
    color: "#374151",
  },
  description: {
    fontSize: "16px",
    lineHeight: "1.6",
    color: "#4b5563",
    whiteSpace: "pre-wrap",
  },
  deadlineSection: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  deadline: {
    fontSize: "16px",
    color: "#4b5563",
  },
  overdue: {
    color: "#dc2626",
    fontWeight: "500",
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  infoCard: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  sidebarTitle: {
    margin: "0 0 16px 0",
    fontSize: "16px",
    fontWeight: "600",
    color: "#374151",
  },
  infoItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    fontSize: "14px",
  },
  infoLabel: {
    fontWeight: "500",
    color: "#6b7280",
    minWidth: "80px",
  },
  infoValue: {
    color: "#374151",
    fontWeight: "500",
  },
  statusCard: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  statusButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  statusButton: {
    padding: "8px 16px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    ":hover": {
      backgroundColor: "#f1f5f9",
    },
    ":disabled": {
      opacity: 0.6,
      cursor: "not-allowed",
    },
  },
    commentsSection: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  commentForm: {
    marginBottom: "20px",
  },
  commentInput: {
    width: "100%",
    padding: "12px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    resize: "vertical",
    fontFamily: "inherit",
    fontSize: "14px",
    marginBottom: "12px",
    ":focus": {
      outline: "none",
      borderColor: "#3b82f6",
    },
  },
  sendButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    ":hover:not(:disabled)": {
      backgroundColor: "#4338ca",
    },
    ":disabled": {
      backgroundColor: "#9ca3af",
      cursor: "not-allowed",
    },
  },
  loadingComments: {
    textAlign: "center",
    padding: "20px",
    color: "#6b7280",
  },
  noComments: {
    textAlign: "center",
    padding: "20px",
    color: "#6b7280",
    fontStyle: "italic",
  },
  commentsList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  commentItem: {
    padding: "16px",
    border: "1px solid #f1f5f9",
    borderRadius: "8px",
    backgroundColor: "#f8fafc",
  },
  commentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    fontSize: "12px",
    color: "#64748b",
  },
  commentAuthor: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "500",
  },
  commentTime: {
    fontSize: "11px",
  },
  commentText: {
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#374151",
    whiteSpace: "pre-wrap",
  },
};

export default TaskDetail;