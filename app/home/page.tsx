// app/home/page.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Plus, X, Trash2, Calendar, Clock, AlignLeft } from "lucide-react";

interface Event {
  event_id: string;
  event_name: string;
  event_datetime: string;
  event_description?: string | null;
}

type KanbanColumn = "upcoming" | "today" | "this-week" | "completed";

export default function KanbanPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    event_name: "",
    event_description: "",
    event_datetime: ""
  });

  useEffect(() => {
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

  const openCreateModal = () => {
    const datetime = new Date();
    datetime.setHours(datetime.getHours() + 1, 0, 0, 0);
    
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

  // Categorize events
  const categorizeEvents = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const categorized: Record<KanbanColumn, Event[]> = {
      today: [],
      "this-week": [],
      upcoming: [],
      completed: []
    };

    events.forEach(event => {
      const eventDate = new Date(event.event_datetime);
      const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

      if (eventDate < now) {
        // Past events go to completed
        categorized.completed.push(event);
      } else if (eventDay.getTime() === today.getTime()) {
        // Today's events
        categorized.today.push(event);
      } else if (eventDate < weekFromNow) {
        // This week's events
        categorized["this-week"].push(event);
      } else {
        // Future events
        categorized.upcoming.push(event);
      }
    });

    // Sort each category by datetime
    Object.keys(categorized).forEach(key => {
      categorized[key as KanbanColumn].sort((a, b) => 
        new Date(a.event_datetime).getTime() - new Date(b.event_datetime).getTime()
      );
    });

    return categorized;
  };

  const categorizedEvents = categorizeEvents();

  const columns: { id: KanbanColumn; title: string; color: string }[] = [
    { id: "today", title: "Today", color: "#ff6b6b" },
    { id: "this-week", title: "This Week", color: "#ffd43b" },
    { id: "upcoming", title: "Upcoming", color: "#5b1be3" },
    { id: "completed", title: "Completed", color: "#51cf66" }
  ];

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
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
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
            Events Board
          </h1>
          
          <button
            onClick={openCreateModal}
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
            New Event
          </button>
        </div>

        {/* Kanban Columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem",
          alignItems: "start"
        }}>
          {columns.map(column => (
            <div
              key={column.id}
              style={{
                backgroundColor: "#2a2a2a",
                borderRadius: "8px",
                border: "1px solid #3a3a3a",
                minHeight: "400px",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Column Header */}
              <div style={{
                padding: "1rem 1.5rem",
                borderBottom: "1px solid #3a3a3a",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                position: "sticky",
                top: 0,
                backgroundColor: "#2a2a2a",
                borderTopLeftRadius: "8px",
                borderTopRightRadius: "8px",
                zIndex: 1
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    backgroundColor: column.color
                  }} />
                  <h3 style={{
                    color: "#b19cd9",
                    fontSize: "1rem",
                    fontWeight: "600",
                    margin: 0
                  }}>
                    {column.title}
                  </h3>
                </div>
                <span style={{
                  backgroundColor: "#3a3a3a",
                  color: "#c0c0c0",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  fontWeight: "600"
                }}>
                  {categorizedEvents[column.id].length}
                </span>
              </div>

              {/* Column Content */}
              <div style={{
                padding: "1rem",
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}>
                {categorizedEvents[column.id].length === 0 ? (
                  <div style={{
                    padding: "2rem",
                    textAlign: "center",
                    color: "#666",
                    fontSize: "0.9rem"
                  }}>
                    No events
                  </div>
                ) : (
                  categorizedEvents[column.id].map(event => (
                    <EventCard
                      key={event.event_id}
                      event={event}
                      color={column.color}
                      onClick={() => openEditModal(event)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
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
                <Calendar size={24} />
                {isCreating ? "Create Event" : "Edit Event"}
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
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
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
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
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
                    resize: "vertical"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
                  onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                />
              </div>
            </div>

            {/* Action Buttons */}
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
          </div>
        </div>
      )}
    </main>
  );
}

// Event Card Component
function EventCard({ event, color, onClick }: { event: Event; color: string; onClick: () => void }) {
  const eventDate = new Date(event.event_datetime);
  const now = new Date();
  const isOverdue = eventDate < now;

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#232323",
        border: `1px solid ${color}20`,
        borderLeft: `3px solid ${color}`,
        borderRadius: "6px",
        padding: "1rem",
        cursor: "pointer",
        transition: "all 0.2s ease",
        opacity: isOverdue ? 0.7 : 1
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#2d2d2d";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 4px 8px ${color}20`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#232323";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <h4 style={{
        color: "#e0e0e0",
        fontSize: "1rem",
        fontWeight: "600",
        margin: "0 0 0.5rem 0",
        lineHeight: "1.4"
      }}>
        {event.event_name}
      </h4>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "0.5rem",
        color: "#888",
        fontSize: "0.85rem"
      }}>
        <Calendar size={14} />
        <span>
          {eventDate.toLocaleDateString("en-US", { 
            month: "short", 
            day: "numeric",
            year: eventDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined
          })}
        </span>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: event.event_description ? "0.75rem" : 0,
        color: "#888",
        fontSize: "0.85rem"
      }}>
        <Clock size={14} />
        <span>
          {eventDate.toLocaleTimeString("en-US", { 
            hour: "2-digit", 
            minute: "2-digit",
            hour12: true 
          })}
        </span>
      </div>

      {event.event_description && (
        <div style={{
          display: "flex",
          alignItems: "start",
          gap: "0.5rem",
          color: "#888",
          fontSize: "0.85rem",
          paddingTop: "0.5rem",
          borderTop: "1px solid #3a3a3a"
        }}>
          <AlignLeft size={14} style={{ marginTop: "0.15rem", flexShrink: 0 }} />
          <p style={{
            margin: 0,
            lineHeight: "1.4",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}>
            {event.event_description}
          </p>
        </div>
      )}
    </div>
  );
}