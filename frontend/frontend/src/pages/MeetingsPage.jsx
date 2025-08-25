import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Calendar, Clock, Users, X, ChevronLeft, ChevronRight, Edit } from "react-feather";

const MeetingPage = () => {
  const { token, user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const teamId = new URLSearchParams(location.search).get("team");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [meetingsRes, tasksRes] = await Promise.all([
        axios.get("http://127.0.0.1:8000/api/meetings/", {
          headers: { Authorization: `Token ${token}` },
        }),
        axios.get("http://127.0.0.1:8000/api/tasks/", {
          headers: { Authorization: `Token ${token}` },
        })
      ]);

      setMeetings(meetingsRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error("Ошибка загрузки данных", err);
      setError("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction) => {
    if (view === "month") {
      const newDate = new Date(currentDate);
      newDate.setMonth(currentDate.getMonth() + direction);
      setCurrentDate(newDate);
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + direction);
      setCurrentDate(newDate);
    }
  };

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    const dayMeetings = Array.isArray(meetings) ? meetings.filter(meeting => 
      meeting.date === dateStr
    ) : [];

    const dayTasks = Array.isArray(tasks) ? tasks.filter(task => 
      task.deadline === dateStr && task.status !== 'completed'
    ) : [];

    return [...dayMeetings, ...dayTasks];
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const startDayOfWeek = firstDay.getDay();
    const startDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    const weeks = [];
    let day = 1;

    weeks.push(
      <div key="header" style={styles.calendarWeekHeader}>
        {daysOfWeek.map(dayName => (
          <div key={dayName} style={styles.dayHeader}>{dayName}</div>
        ))}
      </div>
    );

    for (let i = 0; i < 6; i++) {
      const week = [];
      
      for (let j = 0; j < 7; j++) {
        const cellIndex = i * 7 + j;
        if (cellIndex < startDay || day > daysInMonth) {
          week.push(<div key={j} style={styles.calendarDayEmpty}></div>);
        } else {
          const cellDate = new Date(year, month, day);
          const events = getEventsForDate(cellDate);
          const isToday = new Date().toDateString() === cellDate.toDateString();
          
          week.push(
            <div 
              key={j} 
              style={{
                ...styles.calendarDay,
                ...(isToday && styles.calendarDayToday)
              }}
              onClick={() => {
                setCurrentDate(cellDate);
                setView("day");
              }}
            >
              <div style={styles.dayNumber}>{day}</div>
              <div style={styles.events}>
                {events.slice(0, 2).map((event, index) => (
                  <div 
                    key={index} 
                    style={{
                      ...styles.event,
                      ...(event.date ? styles.eventMeeting : styles.eventTask)
                    }}
                  >
                    {event.date ? '📅' : '✅'} 
                    {event.title ? event.title.substring(0, 15) + (event.title.length > 15 ? '...' : '') : `Встреча ${event.time}`}
                    {event.date && event.organizer?.id === user?.id && (
                      <span style={styles.organizerBadge}> 👑</span>
                    )}
                  </div>
                ))}
                {events.length > 2 && (
                  <div style={styles.moreEvents}>+{events.length - 2} ещё</div>
                )}
              </div>
            </div>
          );
          day++;
        }
      }
      
      weeks.push(<div key={i} style={styles.calendarWeek}>{week}</div>);
      
      if (day > daysInMonth) {
        break;
      }
    }

    return weeks;
  };

  const renderDayView = () => {
    const events = getEventsForDate(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div style={styles.dayView}>
        <div style={styles.dayHeaderContainer}>
          <h3 style={styles.dayTitle}>
            {currentDate.toLocaleDateString('ru-RU', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <div style={styles.dayNavigation}>
            <button 
              onClick={() => navigateDate(-1)}
              style={styles.navButton}
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={() => setView("month")}
              style={styles.monthButton}
            >
              На месяц
            </button>
            <button 
              onClick={() => navigateDate(1)}
              style={styles.navButton}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        
        <div style={styles.timeline}>
          {hours.map((hour) => {
            const hourEvents = events.filter(event => {
              if (event.time) {
                const eventHour = parseInt(event.time.split(':')[0]);
                return eventHour === hour;
              }
              return false;
            });

            return (
              <div key={hour} style={styles.timeSlot}>
                <div style={styles.timeLabel}>
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div style={styles.eventsSlot}>
                  {hourEvents.map((event, index) => (
                    <div key={index} style={styles.timelineEvent}>
                      <div style={styles.eventHeader}>
                        <div style={styles.eventTime}>{event.time}</div>
                        {event.organizer?.id === user?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/meetings/${event.id}/edit?team=${teamId}`);
                            }}
                            style={styles.editEventButton}
                            title="Редактировать встречу"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                      </div>
                      <div style={styles.eventTitle}>
                        {event.title || `Встреча с участниками`}
                      </div>
                      {event.duration && (
                        <div style={styles.eventDuration}>
                          ({event.duration} мин)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={styles.allDayEvents}>
          <h4 style={styles.allDayTitle}>Весь день:</h4>
          {events.filter(event => !event.time).map((event, index) => (
            <div key={index} style={styles.allDayEvent}>
              <span style={styles.eventIcon}>✅</span>
              <span style={styles.eventTitleText}>{event.title}</span>
              <span style={styles.eventType}>(дедлайн)</span>
            </div>
          ))}
          {events.filter(event => !event.time).length === 0 && (
            <div style={styles.noEvents}>Нет событий на весь день</div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div style={styles.loading}>Загрузка...</div>;
  if (error) return <div style={styles.error}>{error}</div>;

  return (
    <div style={styles.meetingPage}>
      <div style={styles.calendarHeader}>
        <h1 style={styles.title}>Календарь</h1>
        
        <div style={styles.controls}>
          <button 
            onClick={() => navigateDate(-1)}
            style={styles.navButton}
          >
            <ChevronLeft size={20} />
          </button>
          
          <h2 style={styles.currentDate}>
            {view === "month" 
              ? currentDate.toLocaleDateString('ru-RU', { 
                  month: 'long', 
                  year: 'numeric' 
                })
              : currentDate.toLocaleDateString('ru-RU', { 
                  day: 'numeric',
                  month: 'long', 
                  year: 'numeric' 
                })
            }
          </h2>
          
          <button 
            onClick={() => navigateDate(1)}
            style={styles.navButton}
          >
            <ChevronRight size={20} />
          </button>
          
          <select 
            value={view} 
            onChange={(e) => setView(e.target.value)}
            style={styles.viewSelect}
          >
            <option value="month">Месяц</option>
            <option value="day">День</option>
          </select>
          {(user?.role === 'admin_team' || user?.role === 'manager') && (
            <button 
              onClick={() => navigate(`/meetings/create?team=${teamId}`)}
              style={styles.createButton}
            >
              <Plus size={16} style={{ marginRight: '8px' }} />
              Новая встреча
            </button>
          )}
        </div>
      </div>

      <div style={styles.calendarContainer}>
        {view === "month" ? renderMonthView() : renderDayView()}
      </div>
    </div>
  );
};

const styles = {
  meetingPage: {
    padding: "20px",
    maxWidth: "1400px",
    margin: "0 auto",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
  },
  calendarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    padding: "20px",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    color: "#1f2937",
    fontWeight: "600",
  },
  controls: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  navButton: {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    background: "white",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
  },
  currentDate: {
    margin: 0,
    fontSize: "18px",
    color: "#374151",
    fontWeight: "500",
    minWidth: "200px",
    textAlign: "center",
  },
  viewSelect: {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    background: "white",
    fontSize: "14px",
  },
  createButton: {
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
  },
  calendarContainer: {
    background: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    minHeight: "600px",
  },
  calendarWeekHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "1px",
    marginBottom: "10px",
  },
  dayHeader: {
    textAlign: "center",
    fontWeight: "600",
    padding: "10px",
    color: "#374151",
    fontSize: "14px",
  },
  calendarWeek: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "1px",
    marginBottom: "1px",
  },
  calendarDay: {
    minHeight: "120px",
    border: "1px solid #e2e8f0",
    padding: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backgroundColor: "white",
  },
  calendarDayToday: {
    backgroundColor: "#fffbeb",
    borderColor: "#f59e0b",
    borderWidth: "2px",
  },
  calendarDayEmpty: {
    minHeight: "120px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
  },
  dayNumber: {
    fontWeight: "bold",
    marginBottom: "8px",
    textAlign: "center",
    fontSize: "14px",
  },
  events: {
    minHeight: "60px",
  },
  event: {
    fontSize: "11px",
    padding: "3px 4px",
    marginBottom: "2px",
    borderRadius: "3px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  eventMeeting: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  eventTask: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  moreEvents: {
    fontSize: "11px",
    color: "#64748b",
    textAlign: "center",
    marginTop: "4px",
    cursor: "pointer",
  },
  organizerBadge: {
    fontSize: "12px",
    marginLeft: "4px",
  },
  dayView: {
    padding: "20px",
  },
  dayHeaderContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "20px",
    borderBottom: "2px solid #e2e8f0",
  },
  dayTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#1f2937",
    fontWeight: "600",
  },
  dayNavigation: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  monthButton: {
    padding: "8px 16px",
    border: "1px solid #e2e8f0",
    background: "white",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
  },
  timeline: {
    marginTop: "20px",
  },
  timeSlot: {
    display: "flex",
    borderBottom: "1px solid #e2e8f0",
    minHeight: "80px",
  },
  timeLabel: {
    width: "80px",
    padding: "12px",
    fontWeight: "500",
    color: "#6b7280",
    fontSize: "14px",
  },
  eventsSlot: {
    flex: 1,
    padding: "12px",
  },
  timelineEvent: {
    padding: "12px",
    marginBottom: "8px",
    borderRadius: "6px",
    backgroundColor: "#dbeafe",
    borderLeft: "4px solid #3b82f6",
  },
  eventHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "8px",
  },
  eventTime: {
    fontWeight: "600",
    color: "#1e40af",
    fontSize: "14px",
  },
  editEventButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#64748b",
    padding: "4px",
    borderRadius: "4px",
    transition: "all 0.2s",
    ":hover": {
      color: "#3b82f6",
      backgroundColor: "#eff6ff",
    },
  },
  eventTitle: {
    fontSize: "14px",
    marginBottom: "4px",
    fontWeight: "500",
  },
  eventDuration: {
    fontSize: "12px",
    color: "#64748b",
  },
  allDayEvents: {
    marginTop: "30px",
    padding: "20px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
  },
  allDayTitle: {
    margin: "0 0 15px 0",
    fontSize: "16px",
    color: "#374151",
    fontWeight: "600",
  },
  allDayEvent: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    marginBottom: "8px",
    backgroundColor: "#dcfce7",
    borderRadius: "6px",
    borderLeft: "4px solid #10b981",
  },
  eventIcon: {
    fontSize: "16px",
  },
  eventTitleText: {
    fontSize: "14px",
    fontWeight: "500",
  },
  eventType: {
    fontSize: "12px",
    color: "#64748b",
  },
  noEvents: {
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    padding: "20px",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    fontSize: "18px",
    color: "#6b7280",
  },
  error: {
    textAlign: "center",
    padding: "40px",
    color: "#dc2626",
    fontSize: "18px",
  },
};

export default MeetingPage;