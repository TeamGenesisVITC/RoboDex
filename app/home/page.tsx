// app/kanban/page.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Plus, X, Trash2, Calendar, Clock, AlignLeft, Tag, Settings as SettingsIcon, GripVertical, Palette } from "lucide-react";

interface Event {
  event_id: string;
  event_name: string;
  event_datetime: string;
  event_description?: string | null;
  tags?: string[] | null;
  project_id?: string | null;
}

interface KanbanColumn {
  column_id: string;
  column_name: string;
  color: string;
  events: string[];
  created_at: string;
  maxSize?: number; // Client-side only for UI limits
}

interface Pool {
  pool_id: string;
  name: string;
}

interface Project {
  project_id: string;
  project_name: string;
  pool?: string;
}

export default function KanbanPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draggedEvent, setDraggedEvent] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnData, setEditingColumnData] = useState<KanbanColumn | null>(null);
  
  // New state for event selector
  const [selectedExistingEvent, setSelectedExistingEvent] = useState<string>("");
  
  // Form state
  const [formData, setFormData] = useState({
    event_name: "",
    event_description: "",
    event_datetime: "",
    tags: [] as string[],
    project_id: ""
  });

  const [selectedPool, setSelectedPool] = useState<string>("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsData, columnsData, poolsData, projectsData] = await Promise.all([
        api<Event[]>("events"),
        api<KanbanColumn[]>("kanban"),
        api<Pool[]>("pools"),
        api<Project[]>("projects")
      ]);
      
      setEvents(eventsData.map(e => ({
        ...e,
        tags: e.tags || []
      })));
      
      // Add this to ensure events is always an array
      setColumns(columnsData.map(c => ({
        ...c,
        events: c.events || []  // Convert null to empty array
      })));
      
      setPools(poolsData);
      setProjects(projectsData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      // Check if any of the selected tags correspond to columns that are at max capacity
      for (const tag of formData.tags) {
        const column = columns.find(c => c.column_id === tag);
        if (column && column.maxSize && column.events.length >= column.maxSize) {
          alert(`Cannot create event: Column "${column.column_name}" has reached its maximum limit of ${column.maxSize} items.`);
          return;
        }
      }
      
      const response = await api<Event>("events", {
        method: "POST",
        body: JSON.stringify({
          event_name: formData.event_name,
          event_datetime: formData.event_datetime,
          event_description: formData.event_description || null,
          tags: formData.tags,
          project_id: formData.project_id || null
        })
      });
      
      // Add event to columns that match the tags
      for (const tag of formData.tags) {
        const column = columns.find(c => c.column_id === tag);
        if (column && !column.events.includes(response.event_id)) {
          await api(`kanban/${column.column_id}`, {
            method: "PATCH",
            body: JSON.stringify({
              events: [...column.events, response.event_id]
            })
          });
        }
      }
      
      await fetchData();
      closeModal();
    } catch (err) {
      alert("Failed to create event: " + (err as Error).message);
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      const updatePayload: Partial<{
        event_name: string;
        event_datetime: string;
        event_description: string | null;
        tags: string[];
        project_id: string | null;
      }> = {};
      
      if (formData.event_name !== selectedEvent.event_name) {
        updatePayload.event_name = formData.event_name;
      }
      if (formData.event_datetime !== selectedEvent.event_datetime) {
        updatePayload.event_datetime = formData.event_datetime;
      }
      if (formData.event_description !== (selectedEvent.event_description || "")) {
        updatePayload.event_description = formData.event_description || null;
      }
      if (JSON.stringify(formData.tags) !== JSON.stringify(selectedEvent.tags || [])) {
        updatePayload.tags = formData.tags;
      }
      if (formData.project_id !== (selectedEvent.project_id || "")) {
        updatePayload.project_id = formData.project_id || null;
      }
      
      if (Object.keys(updatePayload).length === 0) {
        closeModal();
        return;
      }
      
      // Update column associations if tags changed
      if (updatePayload.tags) {
        const oldColumnTags = (selectedEvent.tags || []).filter(t => 
          columns.some(c => c.column_id === t)
        );
        const newColumnTags = formData.tags.filter(t => 
          columns.some(c => c.column_id === t)
        );
        
        // Check if any new columns are at max capacity
        for (const columnId of newColumnTags) {
          if (!oldColumnTags.includes(columnId)) {
            const column = columns.find(c => c.column_id === columnId);
            if (column && column.maxSize && column.events.length >= column.maxSize) {
              alert(`Cannot update event: Column "${column.column_name}" has reached its maximum limit of ${column.maxSize} items.`);
              return;
            }
          }
        }
        
        // Remove from old columns
        for (const columnId of oldColumnTags) {
          if (!newColumnTags.includes(columnId)) {
            const column = columns.find(c => c.column_id === columnId);
            if (column) {
              await api(`kanban/${columnId}`, {
                method: "PATCH",
                body: JSON.stringify({
                  events: column.events.filter(e => e !== selectedEvent.event_id)
                })
              });
            }
          }
        }
        
        // Add to new columns
        for (const columnId of newColumnTags) {
          if (!oldColumnTags.includes(columnId)) {
            const column = columns.find(c => c.column_id === columnId);
            if (column && !column.events.includes(selectedEvent.event_id)) {
              await api(`kanban/${columnId}`, {
                method: "PATCH",
                body: JSON.stringify({
                  events: [...column.events, selectedEvent.event_id]
                })
              });
            }
          }
        }
      }
      
      await api(`events/${selectedEvent.event_id}`, {
        method: "PATCH",
        body: JSON.stringify(updatePayload)
      });
      
      await fetchData();
      closeModal();
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update event: " + (err as Error).message);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    try {
      // Remove from all columns
      for (const column of columns) {
        if (column.events.includes(selectedEvent.event_id)) {
          await api(`kanban/${column.column_id}`, {
            method: "PATCH",
            body: JSON.stringify({
              events: column.events.filter(e => e !== selectedEvent.event_id)
            })
          });
        }
      }
      
      await api(`events/${selectedEvent.event_id}`, {
        method: "DELETE"
      });
      
      await fetchData();
      closeModal();
    } catch (err) {
      alert("Failed to delete event: " + (err as Error).message);
    }
  };

  const handleAddExistingEvent = async (columnId: string) => {
    if (!selectedExistingEvent) return;
    
    try {
      const event = events.find(e => e.event_id === selectedExistingEvent);
      if (!event) return;
      
      const targetColumn = columns.find(c => c.column_id === columnId);
      if (!targetColumn) return;
      
      // Check if target column has reached max limit
      if (targetColumn.maxSize && targetColumn.events.length >= targetColumn.maxSize) {
        alert(`Cannot add event: Column "${targetColumn.column_name}" has reached its maximum limit of ${targetColumn.maxSize} items.`);
        setSelectedExistingEvent("");
        return;
      }
      
      // Remove from all other columns first
      for (const column of columns) {
        if (column.events.includes(selectedExistingEvent)) {
          await api(`kanban/${column.column_id}`, {
            method: "PATCH",
            body: JSON.stringify({
              events: column.events.filter(e => e !== selectedExistingEvent)
            })
          });
        }
      }
      
      // Add to target column
      if (!targetColumn.events.includes(selectedExistingEvent)) {
        await api(`kanban/${columnId}`, {
          method: "PATCH",
          body: JSON.stringify({
            events: [...targetColumn.events, selectedExistingEvent]
          })
        });
      }
      
      // Update event tags
      const currentTags = event.tags || [];
      const nonColumnTags = currentTags.filter(t => 
        !columns.some(c => c.column_id === t)
      );
      const newTags = [...nonColumnTags, columnId];
      
      await api(`events/${selectedExistingEvent}`, {
        method: "PATCH",
        body: JSON.stringify({ tags: newTags })
      });
      
      await fetchData();
      setSelectedExistingEvent("");
    } catch (err) {
      console.error("Failed to add existing event:", err);
      alert("Failed to add event: " + (err as Error).message);
    }
  };

  const openCreateModal = (columnId?: string) => {
    const datetime = new Date();
    datetime.setHours(datetime.getHours() + 1, 0, 0, 0);
    
    const tags = columnId ? [columnId] : [];
    
    setFormData({
      event_name: "",
      event_description: "",
      event_datetime: datetime.toISOString(),
      tags,
      project_id: ""
    });
    setSelectedPool("");
    setSelectedExistingEvent("");
    setIsCreating(true);
    setSelectedEvent(null);
  };

  const openEditModal = (event: Event) => {
    setFormData({
      event_name: event.event_name,
      event_description: event.event_description || "",
      event_datetime: event.event_datetime,
      tags: event.tags || [],
      project_id: event.project_id || ""
    });
    
    if (event.project_id) {
      const project = projects.find(p => p.project_id === event.project_id);
      if (project?.pool) {
        setSelectedPool(project.pool);
      }
    }
    
    setSelectedEvent(event);
    setIsCreating(false);
  };

  const closeModal = () => {
    setSelectedEvent(null);
    setIsCreating(false);
    setFormData({ event_name: "", event_description: "", event_datetime: "", tags: [], project_id: "" });
    setSelectedPool("");
    setNewTag("");
    setSelectedExistingEvent("");
  };

  const handleDragStart = (eventId: string) => {
    setDraggedEvent(eventId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetColumnId: string) => {
    if (!draggedEvent) return;
    
    const event = events.find(e => e.event_id === draggedEvent);
    if (!event) return;
    
    try {
      // Find which column the event is currently in
      const sourceColumn = columns.find(c => c.events.includes(draggedEvent));
      const targetColumn = columns.find(c => c.column_id === targetColumnId);
      
      if (!targetColumn) return;
      
      // Check if target column has reached max limit
      if (targetColumn.maxSize && targetColumn.events.length >= targetColumn.maxSize) {
        // Only allow if the event is already in this column
        if (!targetColumn.events.includes(draggedEvent)) {
          alert(`Cannot add event: Column "${targetColumn.column_name}" has reached its maximum limit of ${targetColumn.maxSize} items.`);
          setDraggedEvent(null);
          return;
        }
      }
      
      // Remove from source column if it exists
      if (sourceColumn && sourceColumn.column_id !== targetColumnId) {
        await api(`kanban/${sourceColumn.column_id}`, {
          method: "PATCH",
          body: JSON.stringify({
            events: sourceColumn.events.filter(e => e !== draggedEvent)
          })
        });
      }
      
      // Add to target column if not already there
      if (!targetColumn.events.includes(draggedEvent)) {
        await api(`kanban/${targetColumnId}`, {
          method: "PATCH",
          body: JSON.stringify({
            events: [...targetColumn.events, draggedEvent]
          })
        });
      }
      
      // Update event tags
      const currentTags = event.tags || [];
      const nonColumnTags = currentTags.filter(t => 
        !columns.some(c => c.column_id === t)
      );
      const newTags = [...nonColumnTags, targetColumnId];
      
      await api(`events/${draggedEvent}`, {
        method: "PATCH",
        body: JSON.stringify({ tags: newTags })
      });
      
      await fetchData();
    } catch (err) {
      console.error("Failed to move event:", err);
    }
    
    setDraggedEvent(null);
  };

  const addColumn = async () => {
    try {
      await api("kanban", {
        method: "POST",
        body: JSON.stringify({
          column_name: "New Column",
          color: "#888888",
          events: []
        })
      });
      await fetchData();
    } catch (err) {
      console.error("Failed to create column:", err);
      alert("Failed to create column: " + (err as Error).message);
    }
  };

  const updateColumn = async (columnId: string, updates: Partial<KanbanColumn>) => {
    try {
      const payload: Partial<{
        column_name: string;
        color: string;
        events: string[];
        maxSize: number | undefined;
      }> = {};
      
      if (updates.column_name !== undefined) {
        payload.column_name = updates.column_name;
      }
      if (updates.color !== undefined) {
        payload.color = updates.color;
      }
      if (updates.events !== undefined) {
        payload.events = updates.events;
      }
      if (updates.maxSize !== undefined) {
        payload.maxSize = updates.maxSize;
      }
      
      await api(`kanban/${columnId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      
      await fetchData();
    } catch (err) {
      console.error("Failed to update column:", err);
    }
  };

  const updateColumnLocal = (columnId: string, updates: Partial<KanbanColumn>) => {
    // For immediate UI updates (like typing in name field)
    setColumns(columns.map(col => 
      col.column_id === columnId ? { ...col, ...updates } : col
    ));
  };

  const deleteColumn = async (columnId: string) => {
    if (!confirm("Delete this column? Events will not be deleted.")) return;
    
    try {
      await api(`kanban/${columnId}`, {
        method: "DELETE"
      });
      await fetchData();
      setEditingColumn(null);
      setEditingColumnData(null);
    } catch (err) {
      console.error("Failed to delete column:", err);
      alert("Failed to delete column: " + (err as Error).message);
    }
  };

  const openColumnSettings = (column: KanbanColumn) => {
    setEditingColumnData({ ...column });
    setEditingColumn(column.column_id);
  };

  const closeColumnSettings = () => {
    setEditingColumn(null);
    setEditingColumnData(null);
  };

  const saveColumnSettings = async () => {
    if (!editingColumnData) return;
    
    try {
      await updateColumn(editingColumnData.column_id, {
        column_name: editingColumnData.column_name,
        color: editingColumnData.color,
        maxSize: editingColumnData.maxSize
      });
      closeColumnSettings();
    } catch (err) {
      console.error("Failed to save column settings:", err);
      alert("Failed to save settings: " + (err as Error).message);
    }
  };

  const getEventsForColumn = (columnId: string) => {
    const column = columns.find(c => c.column_id === columnId);
    if (!column || !column.events) return [];  // Add check for null events
    
    return events.filter(event => column.events.includes(event.event_id));
  };

  const getAvailableEvents = () => {
    // Get events that are not in any column
    const eventsInColumns = new Set(columns.flatMap(c => c.events));
    return events.filter(e => !eventsInColumns.has(e.event_id));
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    if (formData.tags.includes(newTag.trim())) return;
    
    setFormData({
      ...formData,
      tags: [...formData.tags, newTag.trim()]
    });
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  const getProjectsByPool = (poolId: string) => {
    return projects.filter(p => p.pool === poolId);
  };

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.project_id === projectId)?.project_name || "Unknown Project";
  };

  if (loading) {
    return (
      <main style={{
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        padding: "2rem",
        fontFamily: "'Montserrat', sans-serif"
      }}>
        <div style={{ textAlign: "center", padding: "3rem", color: "#888", fontSize: "1.2rem" }}>
          Loading...
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
      <div style={{ maxWidth: "1800px", margin: "0 auto" }}>
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
            WorkDeck
          </h1>
          
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={addColumn}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#2a2a2a",
                border: "1px solid #3a3a3a",
                borderRadius: "6px",
                color: "#e0e0e0",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: "'Montserrat', sans-serif",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#5b1be3";
                e.currentTarget.style.backgroundColor = "#2d2d2d";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#3a3a3a";
                e.currentTarget.style.backgroundColor = "#2a2a2a";
              }}
            >
              <Plus size={20} />
              Add Column
            </button>
            
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
              New Event
            </button>
          </div>
        </div>

        {/* Kanban Columns */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1.5rem",
          paddingBottom: "1rem"
        }}>
          {columns.map(column => {
            const columnEvents = getEventsForColumn(column.column_id);
            const isOverLimit = column.maxSize && columnEvents.length >= column.maxSize;

            return (
              <div
                key={column.column_id}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.column_id)}
                style={{
                  backgroundColor: "#2a2a2a",
                  borderRadius: "8px",
                  border: `1px solid ${draggedEvent ? column.color + "80" : "#3a3a3a"}`,
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
                  backgroundColor: "#2a2a2a",
                  borderTopLeftRadius: "8px",
                  borderTopRightRadius: "8px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
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
                      {column.column_name}
                    </h3>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{
                      backgroundColor: isOverLimit ? "#3a2a2a" : "#3a3a3a",
                      color: isOverLimit ? "#ff6b6b" : "#c0c0c0",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "12px",
                      fontSize: "0.75rem",
                      fontWeight: "600"
                    }}>
                      {columnEvents.length}{column.maxSize ? `/${column.maxSize}` : ""}
                    </span>
                    
                    <button
                      onClick={() => openColumnSettings(column)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#888",
                        cursor: "pointer",
                        padding: "0.25rem",
                        display: "flex"
                      }}
                    >
                      <SettingsIcon size={16} />
                    </button>
                  </div>
                </div>

                {/* Column Settings - Removed inline dropdown */}

                {/* Column Content */}
                <div style={{
                  padding: "1rem",
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}>
                  <button
                    onClick={() => openCreateModal(column.column_id)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "transparent",
                      border: "2px dashed #3a3a3a",
                      borderRadius: "6px",
                      color: "#888",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontFamily: "'Montserrat', sans-serif",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = column.color;
                      e.currentTarget.style.color = column.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#3a3a3a";
                      e.currentTarget.style.color = "#888";
                    }}
                  >
                    <Plus size={16} />
                    Add Event
                  </button>
                  
                  {/* Existing Event Selector */}
                  {getAvailableEvents().length > 0 && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <select
                        value={selectedExistingEvent}
                        onChange={(e) => setSelectedExistingEvent(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "0.5rem",
                          backgroundColor: "#232323",
                          border: "1px solid #3a3a3a",
                          borderRadius: "4px",
                          color: "#e0e0e0",
                          fontSize: "0.85rem",
                          fontFamily: "'Montserrat', sans-serif",
                          outline: "none"
                        }}
                      >
                        <option value="">Add existing event...</option>
                        {getAvailableEvents().map(event => (
                          <option key={event.event_id} value={event.event_id}>
                            {event.event_name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAddExistingEvent(column.column_id)}
                        disabled={!selectedExistingEvent}
                        style={{
                          padding: "0.5rem 0.75rem",
                          backgroundColor: selectedExistingEvent ? "#5b1be3" : "#3a3a3a",
                          border: "none",
                          borderRadius: "4px",
                          color: selectedExistingEvent ? "white" : "#666",
                          fontSize: "0.85rem",
                          cursor: selectedExistingEvent ? "pointer" : "not-allowed",
                          fontFamily: "'Montserrat', sans-serif"
                        }}
                      >
                        Add
                      </button>
                    </div>
                  )}
                  
                  {columnEvents.length === 0 ? (
                    <div style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "#666",
                      fontSize: "0.9rem"
                    }}>
                      No events
                    </div>
                  ) : (
                    columnEvents.map(event => (
                      <EventCard
                        key={event.event_id}
                        event={event}
                        color={column.color}
                        columnId={column.column_id}
                        projectName={event.project_id ? getProjectName(event.project_id) : undefined}
                        onClick={() => openEditModal(event)}
                        onDragStart={() => handleDragStart(event.event_id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
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
            padding: "1rem",
            overflowY: "auto"
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: "8px",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: "auto"
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
              {/* Existing Event Selector - Only show when creating */}
              {isCreating && (
                <div>
                  <label style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    color: "#c0c0c0",
                    fontWeight: "500",
                    fontSize: "0.9rem"
                  }}>
                    Select Existing Event (Optional)
                  </label>
                  <select
                    value={selectedExistingEvent}
                    onChange={(e) => {
                      const eventId = e.target.value;
                      setSelectedExistingEvent(eventId);
                      
                      if (eventId) {
                        const event = events.find(ev => ev.event_id === eventId);
                        if (event) {
                          setFormData({
                            event_name: event.event_name,
                            event_description: event.event_description || "",
                            event_datetime: event.event_datetime,
                            tags: event.tags || [],
                            project_id: event.project_id || ""
                          });
                          
                          if (event.project_id) {
                            const project = projects.find(p => p.project_id === event.project_id);
                            if (project?.pool) {
                              setSelectedPool(project.pool);
                            }
                          }
                        }
                      } else {
                        const datetime = new Date();
                        datetime.setHours(datetime.getHours() + 1, 0, 0, 0);
                        setFormData({
                          event_name: "",
                          event_description: "",
                          event_datetime: datetime.toISOString(),
                          tags: [],
                          project_id: ""
                        });
                        setSelectedPool("");
                      }
                    }}
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
                  >
                    <option value="">Create new event...</option>
                    {events.map(event => (
                      <option key={event.event_id} value={event.event_id}>
                        {event.event_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  disabled={!!selectedExistingEvent}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: selectedExistingEvent ? "#1a1a1a" : "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: selectedExistingEvent ? "#666" : "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none",
                    cursor: selectedExistingEvent ? "not-allowed" : "text"
                  }}
                  onFocus={(e) => !selectedExistingEvent && (e.target.style.borderColor = "#5b1be3")}
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
                  disabled={!!selectedExistingEvent}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: selectedExistingEvent ? "#1a1a1a" : "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: selectedExistingEvent ? "#666" : "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none",
                    cursor: selectedExistingEvent ? "not-allowed" : "text"
                  }}
                  onFocus={(e) => !selectedExistingEvent && (e.target.style.borderColor = "#5b1be3")}
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
                  rows={3}
                  disabled={!!selectedExistingEvent}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: selectedExistingEvent ? "#1a1a1a" : "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: selectedExistingEvent ? "#666" : "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none",
                    resize: "vertical",
                    cursor: selectedExistingEvent ? "not-allowed" : "text"
                  }}
                  onFocus={(e) => !selectedExistingEvent && (e.target.style.borderColor = "#5b1be3")}
                  onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                />
              </div>

              {/* Project Selection */}
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#c0c0c0",
                  fontWeight: "500",
                  fontSize: "0.9rem"
                }}>
                  Project (Optional)
                </label>
                <select
                  value={selectedPool}
                  onChange={(e) => {
                    setSelectedPool(e.target.value);
                    setFormData({ ...formData, project_id: "" });
                  }}
                  disabled={!!selectedExistingEvent}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    backgroundColor: selectedExistingEvent ? "#1a1a1a" : "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: selectedExistingEvent ? "#666" : "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none",
                    marginBottom: "0.5rem",
                    cursor: selectedExistingEvent ? "not-allowed" : "pointer"
                  }}
                >
                  <option value="">Select Pool</option>
                  {pools.map(pool => (
                    <option key={pool.pool_id} value={pool.pool_id}>
                      {pool.name}
                    </option>
                  ))}
                </select>
                
                {selectedPool && (
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    disabled={!!selectedExistingEvent}
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      backgroundColor: selectedExistingEvent ? "#1a1a1a" : "#232323",
                      border: "1px solid #3a3a3a",
                      borderRadius: "6px",
                      color: selectedExistingEvent ? "#666" : "#e0e0e0",
                      fontSize: "1rem",
                      fontFamily: "'Montserrat', sans-serif",
                      outline: "none",
                      cursor: selectedExistingEvent ? "not-allowed" : "pointer"
                    }}
                  >
                    <option value="">Select Project</option>
                    {getProjectsByPool(selectedPool).map(project => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.project_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tags */}
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#c0c0c0",
                  fontWeight: "500",
                  fontSize: "0.9rem"
                }}>
                  Tags
                </label>
                
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  {formData.tags.map(tag => {
                    const column = columns.find(c => c.column_id === tag);
                    const isColumnTag = !!column;
                    
                    return (
                      <div
                        key={tag}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.4rem 0.75rem",
                          backgroundColor: isColumnTag ? column.color + "30" : "#3a3a3a",
                          border: `1px solid ${isColumnTag ? column.color : "#3a3a3a"}`,
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          color: isColumnTag ? "#e0e0e0" : "#c0c0c0"
                        }}
                      >
                        {isColumnTag ? (
                          <>
                            <span style={{ 
                              width: "8px", 
                              height: "8px", 
                              borderRadius: "50%", 
                              backgroundColor: column.color 
                            }} />
                            {column.column_name}
                          </>
                        ) : (
                          <Tag size={14} />
                        )}
                        <span>{tag}</span>
                        <button
                          onClick={() => removeTag(tag)}
                          disabled={!!selectedExistingEvent}
                          style={{
                            background: "none",
                            border: "none",
                            color: selectedExistingEvent ? "#444" : "#888",
                            cursor: selectedExistingEvent ? "not-allowed" : "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add custom tag"
                    disabled={!!selectedExistingEvent}
                    style={{
                      flex: 1,
                      padding: "0.875rem",
                      backgroundColor: selectedExistingEvent ? "#1a1a1a" : "#232323",
                      border: "1px solid #3a3a3a",
                      borderRadius: "6px",
                      color: selectedExistingEvent ? "#666" : "#e0e0e0",
                      fontSize: "1rem",
                      fontFamily: "'Montserrat', sans-serif",
                      outline: "none",
                      cursor: selectedExistingEvent ? "not-allowed" : "text"
                    }}
                    onFocus={(e) => !selectedExistingEvent && (e.target.style.borderColor = "#5b1be3")}
                    onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                  />
                  <button
                    onClick={addTag}
                    disabled={!!selectedExistingEvent}
                    style={{
                      padding: "0.875rem 1.5rem",
                      backgroundColor: selectedExistingEvent ? "#2a2a2a" : "#3a3a3a",
                      border: "none",
                      borderRadius: "6px",
                      color: selectedExistingEvent ? "#444" : "#e0e0e0",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: selectedExistingEvent ? "not-allowed" : "pointer",
                      fontFamily: "'Montserrat', sans-serif",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => !selectedExistingEvent && (e.currentTarget.style.backgroundColor = "#4a4a4a")}
                    onMouseLeave={(e) => !selectedExistingEvent && (e.currentTarget.style.backgroundColor = "#3a3a3a")}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                gap: "0.75rem",
                marginTop: "1rem",
                justifyContent: "flex-end"
              }}>
                {!isCreating && (
                  <button
                    onClick={handleDeleteEvent}
                    style={{
                      padding: "0.875rem 1.5rem",
                      backgroundColor: "#3a2a2a",
                      border: "1px solid #3a3a3a",
                      borderRadius: "6px",
                      color: "#ff6b6b",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontFamily: "'Montserrat', sans-serif",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#4a2a2a"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#3a2a2a"}
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                )}
                
                <button
                  onClick={closeModal}
                  style={{
                    padding: "0.875rem 1.5rem",
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: "#c0c0c0",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontFamily: "'Montserrat', sans-serif",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2d2d2d"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2a2a2a"}
                >
                  Cancel
                </button>
                
                <button
                  onClick={isCreating ? handleCreateEvent : handleUpdateEvent}
                  disabled={!formData.event_name.trim()}
                  style={{
                    padding: "0.875rem 1.5rem",
                    backgroundColor: formData.event_name.trim() ? "#5b1be3" : "#3a3a3a",
                    border: "none",
                    borderRadius: "6px",
                    color: formData.event_name.trim() ? "white" : "#666",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: formData.event_name.trim() ? "pointer" : "not-allowed",
                    fontFamily: "'Montserrat', sans-serif",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (formData.event_name.trim()) {
                      e.currentTarget.style.backgroundColor = "#4a0fbf";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.event_name.trim()) {
                      e.currentTarget.style.backgroundColor = "#5b1be3";
                    }
                  }}
                >
                  {isCreating ? "Create Event" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column Settings Modal */}
      {editingColumn && editingColumnData && (
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
          onClick={closeColumnSettings}
        >
          <div
            style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: "8px",
              padding: "2rem",
              maxWidth: "500px",
              width: "100%"
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
                <SettingsIcon size={24} />
                Column Settings
              </h2>
              <button
                onClick={closeColumnSettings}
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
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Column Name */}
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#c0c0c0",
                  fontWeight: "500",
                  fontSize: "0.9rem"
                }}>
                  Column Name
                </label>
                <input
                  type="text"
                  value={editingColumnData.column_name}
                  onChange={(e) => setEditingColumnData({ ...editingColumnData, column_name: e.target.value })}
                  placeholder="Enter column name"
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

              {/* Color */}
              <div>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                  color: "#c0c0c0",
                  fontWeight: "500",
                  fontSize: "0.9rem"
                }}>
                  <Palette size={16} />
                  Color
                </label>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <input
                    type="color"
                    value={editingColumnData.color}
                    onChange={(e) => setEditingColumnData({ ...editingColumnData, color: e.target.value })}
                    style={{
                      width: "80px",
                      height: "45px",
                      border: "1px solid #3a3a3a",
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: "#232323"
                    }}
                  />
                  <input
                    type="text"
                    value={editingColumnData.color}
                    onChange={(e) => setEditingColumnData({ ...editingColumnData, color: e.target.value })}
                    placeholder="#888888"
                    style={{
                      flex: 1,
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
              </div>

              {/* Max Items */}
              <div>
                <label style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  color: "#c0c0c0",
                  fontWeight: "500",
                  fontSize: "0.9rem"
                }}>
                  Max Items (Optional)
                </label>
                <input
                  type="number"
                  value={editingColumnData.maxSize || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditingColumnData({ 
                      ...editingColumnData, 
                      maxSize: value ? parseInt(value) : undefined 
                    });
                  }}
                  placeholder="No limit"
                  min="1"
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

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                gap: "0.75rem",
                marginTop: "1rem",
                justifyContent: "space-between"
              }}>
                <button
                  onClick={() => deleteColumn(editingColumnData.column_id)}
                  style={{
                    padding: "0.875rem 1.5rem",
                    backgroundColor: "#3a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: "#ff6b6b",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontFamily: "'Montserrat', sans-serif",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#4a2a2a"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#3a2a2a"}
                >
                  <Trash2 size={18} />
                  Delete Column
                </button>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    onClick={closeColumnSettings}
                    style={{
                      padding: "0.875rem 1.5rem",
                      backgroundColor: "#2a2a2a",
                      border: "1px solid #3a3a3a",
                      borderRadius: "6px",
                      color: "#c0c0c0",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontFamily: "'Montserrat', sans-serif",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2d2d2d"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2a2a2a"}
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={saveColumnSettings}
                    disabled={!editingColumnData.column_name.trim()}
                    style={{
                      padding: "0.875rem 1.5rem",
                      backgroundColor: editingColumnData.column_name.trim() ? "#5b1be3" : "#3a3a3a",
                      border: "none",
                      borderRadius: "6px",
                      color: editingColumnData.column_name.trim() ? "white" : "#666",
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: editingColumnData.column_name.trim() ? "pointer" : "not-allowed",
                      fontFamily: "'Montserrat', sans-serif",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (editingColumnData.column_name.trim()) {
                        e.currentTarget.style.backgroundColor = "#4a0fbf";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (editingColumnData.column_name.trim()) {
                        e.currentTarget.style.backgroundColor = "#5b1be3";
                      }
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// EventCard Component
interface EventCardProps {
  event: Event;
  color: string;
  columnId: string;
  projectName?: string;
  onClick: () => void;
  onDragStart: () => void;
}

function EventCard({ event, color, columnId, projectName, onClick, onDragStart }: EventCardProps) {
  const eventDate = new Date(event.event_datetime);
  const now = new Date();
  const isOverdue = eventDate < now;
  
  // Get non-column tags for display as badges
  const badges = (event.tags || []).filter(tag => tag !== columnId);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        backgroundColor: "#232323",
        border: `1px solid ${color}40`,
        borderLeft: `4px solid ${color}`,
        borderRadius: "6px",
        padding: "1rem",
        cursor: "grab",
        transition: "all 0.2s ease",
        userSelect: "none"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#2a2a2a";
        e.currentTarget.style.borderColor = color + "60";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#232323";
        e.currentTarget.style.borderColor = color + "40";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <GripVertical size={16} color="#666" style={{ marginTop: "0.2rem", flexShrink: 0 }} />
        <h4 style={{
          color: "#e0e0e0",
          fontSize: "0.95rem",
          fontWeight: "600",
          margin: 0,
          flex: 1,
          lineHeight: "1.4"
        }}>
          {event.event_name}
        </h4>
      </div>

      {event.event_description && (
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          marginLeft: "1.5rem"
        }}>
          <AlignLeft size={14} color="#888" style={{ marginTop: "0.15rem", flexShrink: 0 }} />
          <p style={{
            color: "#a0a0a0",
            fontSize: "0.85rem",
            margin: 0,
            lineHeight: "1.4",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical"
          }}>
            {event.event_description}
          </p>
        </div>
      )}

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: badges.length > 0 || projectName ? "0.75rem" : 0,
        marginLeft: "1.5rem"
      }}>
        <Clock size={14} color={isOverdue ? "#ff6b6b" : "#888"} />
        <span style={{
          color: isOverdue ? "#ff6b6b" : "#a0a0a0",
          fontSize: "0.8rem"
        }}>
          {eventDate.toLocaleDateString("en-US", { 
            month: "short", 
            day: "numeric",
            year: eventDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined
          })} at {eventDate.toLocaleTimeString("en-US", { 
            hour: "numeric", 
            minute: "2-digit",
            hour12: true 
          })}
        </span>
      </div>

      {(badges.length > 0 || projectName) && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginLeft: "1.5rem"
        }}>
          {projectName && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.25rem 0.6rem",
              backgroundColor: "#2a4a5a",
              border: "1px solid #3a5a6a",
              borderRadius: "4px",
              fontSize: "0.75rem",
              color: "#7eb8d4"
            }}>
              <div style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#7eb8d4"
              }} />
              {projectName}
            </div>
          )}
          
          {badges.map(tag => (
            <div
              key={tag}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.6rem",
                backgroundColor: "#3a3a3a",
                border: "1px solid #4a4a4a",
                borderRadius: "4px",
                fontSize: "0.75rem",
                color: "#b0b0b0"
              }}
            >
              <Tag size={12} />
              {tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}