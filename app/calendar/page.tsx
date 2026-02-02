// app/calendar/page.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Calendar as CalendarIcon } from "lucide-react";

interface Event {
  event_id: string;
  event_name: string;
  event_datetime: string;
  event_description?: string | null;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearance, setClearance] = useState<number>(0);
  
  // Form state
  const [formData, setFormData] = useState({
    event_name: "",
    event_description: "",
    event_datetime: ""
  });

  useEffect(() => {
    // Get clearance from sessionStorage
    const storedClearance = sessionStorage.getItem("clearance");
    if (storedClearance) {
      setClearance(parseInt(storedClearance));
    }

    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const data = await api<Event[]>("events");
      setEvents(data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (clearance < 5) {
      alert("You don't have permission to create events");
      return;
    }

    try {
      await api("events", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      await fetchEvents();
      closeModal();
    } catch (err) {
      alert("Failed to create event: " + (err as Error).message);
    }
  };

  const handleUpdateEvent = async () => {
    if (clearance < 5) {
      alert("You don't have permission to update events");
      return;
    }

    if (!selectedEvent) return;
    
    try {
      await api(`events/${selectedEvent.event_id}`, {
        method: "PATCH",
        body: JSON.stringify(formData)
      });
      await fetchEvents();
      closeModal();
    } catch (err) {
      alert("Failed to update event: " + (err as Error).message);
    }
  };

  const handleDeleteEvent = async () => {
    if (clearance < 5) {
      alert("You don't have permission to delete events");
      return;
    }

    if (!selectedEvent) return;
    
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    try {
      await api(`events/${selectedEvent.event_id}`, {
        method: "DELETE"
      });
      await fetchEvents();
      closeModal();
    } catch (err) {
      alert("Failed to delete event: " + (err as Error).message);
    }
  };

  const openCreateModal = (date?: Date) => {
    if (clearance < 5) {
      return; // Don't open modal if user doesn't have permission
    }

    const datetime = date || new Date();
    datetime.setHours(12, 0, 0, 0);
    
    setFormData({
      event_name: "",
      event_description: "",
      event_datetime: datetime.toISOString()
    });
    setIsCreating(true);
    setSelectedEvent(null);
  };

  const openEditModal = (event: Event) => {
    setFormData({
      event_name: event.event_name,
      event_description: event.event_description || "",
      event_datetime: event.event_datetime
    });
    setSelectedEvent(event);
    setIsCreating(false);
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setIsCreating(false);
    setFormData({ event_name: "", event_description: "", event_datetime: "" });
  };

  // Calendar logic
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getEventsForDate = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split("T")[0];
    
    return events.filter(event => {
      const eventDate = new Date(event.event_datetime).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthYear = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  if (loading) {
    return (
      <main style={{
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        padding: "2rem",
        fontFamily: "'Montserrat', sans-serif"
      }}>
        <div style={{ textAlign: "center", padding: "3rem", color: "#888", fontSize: "1.2rem" }}>
          Loading events...
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#1a1a1a",
      padding: "2rem",
      fontFamily: "'Montserrat', sans-serif",
      paddingLeft: "5rem"
    }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <h1 style={{
            color: "#8550e9",
            fontSize: "2.5rem",
            fontWeight: "600",
            letterSpacing: "0.5px",
            margin: 0
          }}>
            Events Calendar
          </h1>
          
          {clearance >= 5 && (
            <button
              onClick={() => openCreateModal()}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#5b1be3",
                border: "none",
                borderRadius: "6px",
                color: "white",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: "'Montserrat', sans-serif",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#4a0fbf"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#5b1be3"}
            >
              <Plus size={20} />
              Create Event
            </button>
          )}
        </div>

        {/* Calendar Navigation */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          padding: "1rem",
          backgroundColor: "#2a2a2a",
          borderRadius: "8px",
          border: "1px solid #3a3a3a"
        }}>
          <button
            onClick={previousMonth}
            style={{
              padding: "0.5rem",
              backgroundColor: "transparent",
              border: "1px solid #3a3a3a",
              borderRadius: "4px",
              color: "#e0e0e0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#5b1be3";
              e.currentTarget.style.backgroundColor = "#2d2d2d";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#3a3a3a";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <ChevronLeft size={24} />
          </button>

          <h2 style={{
            color: "#b19cd9",
            fontSize: "1.5rem",
            fontWeight: "600",
            margin: 0
          }}>
            {monthYear}
          </h2>

          <button
            onClick={nextMonth}
            style={{
              padding: "0.5rem",
              backgroundColor: "transparent",
              border: "1px solid #3a3a3a",
              borderRadius: "4px",
              color: "#e0e0e0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#5b1be3";
              e.currentTarget.style.backgroundColor = "#2d2d2d";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#3a3a3a";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{
          backgroundColor: "#2a2a2a",
          borderRadius: "8px",
          border: "1px solid #3a3a3a",
          overflow: "hidden"
        }}>
          {/* Day Headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            backgroundColor: "#232323",
            borderBottom: "1px solid #3a3a3a"
          }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div
                key={day}
                style={{
                  padding: "1rem",
                  textAlign: "center",
                  color: "#b19cd9",
                  fontWeight: "600",
                  fontSize: "0.9rem"
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "1px",
            backgroundColor: "#3a3a3a"
          }}>
            {calendarDays.map((day, index) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const today = day ? isToday(day) : false;

              return (
                <div
                  key={index}
                  style={{
                    minHeight: "120px",
                    backgroundColor: "#2a2a2a",
                    padding: "0.5rem",
                    position: "relative"
                  }}
                >
                  {day && (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.5rem"
                        }}
                      >
                        <span
                          style={{
                            color: today ? "#8550e9" : "#c0c0c0",
                            fontWeight: today ? "700" : "500",
                            fontSize: "0.9rem",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            backgroundColor: today ? "#2a2a4a" : "transparent"
                          }}
                        >
                          {day}
                        </span>
                        
                        {clearance >= 5 && (
                          <button
                            onClick={() => openCreateModal(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#888",
                              cursor: "pointer",
                              padding: "0.25rem",
                              display: "flex",
                              alignItems: "center",
                              borderRadius: "3px",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#3a3a3a";
                              e.currentTarget.style.color = "#5b1be3";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.color = "#888";
                            }}
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>

                      {/* Events */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        {dayEvents.map(event => (
                          <div
                            key={event.event_id}
                            onClick={() => openEditModal(event)}
                            style={{
                              padding: "0.25rem 0.5rem",
                              backgroundColor: "#5b1be3",
                              borderRadius: "3px",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              color: "white",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#4a0fbf"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#5b1be3"}
                          >
                            {new Date(event.event_datetime).toLocaleTimeString("en-US", { 
                              hour: "2-digit", 
                              minute: "2-digit",
                              hour12: true 
                            })} - {event.event_name}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      {(selectedEvent || isCreating) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem"
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: "8px",
              padding: "2rem",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem"
            }}>
              <h2 style={{
                color: "#b19cd9",
                fontSize: "1.5rem",
                fontWeight: "600",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <CalendarIcon size={24} />
                {isCreating ? "Create Event" : "Event Details"}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                  padding: "0.25rem",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#c0c0c0",
                  fontWeight: "500",
                  fontSize: "0.9rem"
                }}>
                  Event Name
                </label>
                <input
                  type="text"
                  value={formData.event_name}
                  onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                  placeholder="Enter event name"
                  disabled={clearance < 5 && !isCreating}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none",
                    cursor: clearance < 5 && !isCreating ? "not-allowed" : "text"
                  }}
                  onFocus={(e) => clearance >= 5 && (e.target.style.borderColor = "#5b1be3")}
                  onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#c0c0c0",
                  fontWeight: "500",
                  fontSize: "0.9rem"
                }}>
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.event_datetime ? new Date(formData.event_datetime).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setFormData({ ...formData, event_datetime: new Date(e.target.value).toISOString() })}
                  disabled={clearance < 5 && !isCreating}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none",
                    cursor: clearance < 5 && !isCreating ? "not-allowed" : "text"
                  }}
                  onFocus={(e) => clearance >= 5 && (e.target.style.borderColor = "#5b1be3")}
                  onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                />
              </div>

              <div>
                <label style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#c0c0c0",
                  fontWeight: "500",
                  fontSize: "0.9rem"
                }}>
                  Description (Optional)
                </label>
                <textarea
                  value={formData.event_description}
                  onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
                  placeholder="Enter event description"
                  rows={4}
                  disabled={clearance < 5 && !isCreating}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none",
                    resize: "vertical",
                    cursor: clearance < 5 && !isCreating ? "not-allowed" : "text"
                  }}
                  onFocus={(e) => clearance >= 5 && (e.target.style.borderColor = "#5b1be3")}
                  onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                />
              </div>
            </div>

            {/* Action Buttons */}
            {clearance >= 5 && (
              <div style={{
                display: "flex",
                gap: "0.75rem",
                marginTop: "1.5rem",
                flexWrap: "wrap"
              }}>
                <button
                  onClick={isCreating ? handleCreateEvent : handleUpdateEvent}
                  disabled={!formData.event_name || !formData.event_datetime}
                  style={{
                    flex: 1,
                    padding: "0.875rem",
                    backgroundColor: formData.event_name && formData.event_datetime ? "#5b1be3" : "#3a3a3a",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: formData.event_name && formData.event_datetime ? "pointer" : "not-allowed",
                    fontFamily: "'Montserrat', sans-serif",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (formData.event_name && formData.event_datetime) {
                      e.currentTarget.style.backgroundColor = "#4a0fbf";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.event_name && formData.event_datetime) {
                      e.currentTarget.style.backgroundColor = "#5b1be3";
                    }
                  }}
                >
                  {isCreating ? "Create Event" : "Save Changes"}
                </button>

                {!isCreating && (
                  <button
                    onClick={handleDeleteEvent}
                    style={{
                      padding: "0.875rem",
                      backgroundColor: "#3a2a2a",
                      color: "#ff6b6b",
                      border: "1px solid #3a3a3a",
                      borderRadius: "6px",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontFamily: "'Montserrat', sans-serif",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#4a2a2a";
                      e.currentTarget.style.borderColor = "#f44336";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#3a2a2a";
                      e.currentTarget.style.borderColor = "#3a3a3a";
                    }}
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                )}
              </div>
            )}

            {/* Read-only message for low clearance users */}
            {clearance < 5 && !isCreating && (
              <div style={{
                marginTop: "1.5rem",
                padding: "1rem",
                backgroundColor: "rgba(255, 193, 7, 0.1)",
                border: "1px solid rgba(255, 193, 7, 0.3)",
                borderRadius: "6px",
                color: "#ffc107",
                fontSize: "0.9rem",
                textAlign: "center"
              }}>
                You do not have permission to edit or delete events
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}