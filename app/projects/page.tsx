// app/projects/page.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useRouter } from "next/navigation";
import { Trash2, Settings } from "lucide-react";

interface Project {
  project_id: string;
  project_name: string;
  description?: string;
  pool?: string;
}

interface Pool {
  pool_id: string;
  name: string;
  description?: string;
  managers?: string[];
  created_at?: string;
}

interface Member {
  member_id: string;
  name: string;
  department: string;
  phone: string;
  clearance: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearance, setClearance] = useState<number>(0);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [managerDetails, setManagerDetails] = useState<Member[]>([]);
  
  // Modal states
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showPoolSettings, setShowPoolSettings] = useState(false);
  const [currentPool, setCurrentPool] = useState<Pool | null>(null);
  
  // Form states
  const [poolName, setPoolName] = useState("");
  const [poolDescription, setPoolDescription] = useState("");
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("");
  
  // Manager search states
  const [managerSearch, setManagerSearch] = useState("");
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    // Get clearance from sessionStorage
    const storedClearance = sessionStorage.getItem("clearance");
    if (storedClearance) {
      setClearance(parseInt(storedClearance));
    }

    async function fetchData() {
      try {
        const [projectsData, poolsData, membersData] = await Promise.all([
          api<Project[]>("projects"),
          api<Pool[]>("pools"),
          api<Member[]>("members")
        ]);
        setProjects(projectsData);
        setPools(poolsData);
        setAllMembers(membersData);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch manager details when a pool is selected
  useEffect(() => {
    async function fetchManagerDetails() {
      if (selectedPool) {
        const pool = pools.find(p => p.pool_id === selectedPool);
        if (pool && pool.managers && pool.managers.length > 0) {
          try {
            const details = await api<Member[]>("members/batch", {
              method: "POST",
              body: JSON.stringify({ member_id: pool.managers })
            });
            setManagerDetails(details);
          } catch (err) {
            console.error("Failed to fetch manager details:", err);
            setManagerDetails([]);
          }
        } else {
          setManagerDetails([]);
        }
      }
    }
    fetchManagerDetails();
  }, [selectedPool, pools]);

  const getProjectsForPool = (poolId: string) => {
    return projects.filter(p => p.pool === poolId);
  };

  const getProjectsWithoutPool = () => {
    return projects.filter(p => !p.pool);
  };

  // Filter members based on search
  const filteredMembers = allMembers.filter(member =>
    member.name.toLowerCase().includes(managerSearch.toLowerCase())
  );

  // Get selected member names
  const getSelectedManagerNames = () => {
    return allMembers
      .filter(m => selectedManagers.includes(m.member_id))
      .map(m => m.name)
      .join(", ");
  };

  // Create Pool
  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("pool", {
        method: "POST",
        body: JSON.stringify({
          name: poolName,
          description: poolDescription,
          managers: selectedManagers
        })
      });
      
      // Refresh pools
      const poolsData = await api<Pool[]>("pools");
      setPools(poolsData);
      
      // Reset form
      setPoolName("");
      setPoolDescription("");
      setSelectedManagers([]);
      setManagerSearch("");
      setShowCreatePool(false);
    } catch (err) {
      console.error("Failed to create pool:", err);
      alert("Failed to create pool");
    }
  };

  // Update Pool
  const handleUpdatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPool) return;
    
    try {
      await api(`pool/${currentPool.pool_id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: poolName,
          description: poolDescription,
          managers: selectedManagers
        })
      });
      
      // Refresh pools
      const poolsData = await api<Pool[]>("pools");
      setPools(poolsData);
      
      // Reset form
      setPoolName("");
      setPoolDescription("");
      setSelectedManagers([]);
      setManagerSearch("");
      setCurrentPool(null);
      setShowPoolSettings(false);
    } catch (err) {
      console.error("Failed to update pool:", err);
      alert("Failed to update pool");
    }
  };

  // Delete Pool
  const handleDeletePool = async (poolId: string) => {
    if (!confirm("Are you sure you want to delete this pool? This action cannot be undone.")) {
      return;
    }
    
    try {
      await api(`pool/${poolId}`, {
        method: "DELETE"
      });
      
      // Refresh pools
      const poolsData = await api<Pool[]>("pools");
      setPools(poolsData);
      
      setShowPoolSettings(false);
      setCurrentPool(null);
      setSelectedPool(null);
    } catch (err) {
      console.error("Failed to delete pool:", err);
      alert("Failed to delete pool");
    }
  };

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("projects", {
        method: "POST",
        body: JSON.stringify({
          project_name: projectName,
          pool: selectedPool
        })
      });
      
      // Refresh projects
      const projectsData = await api<Project[]>("projects");
      setProjects(projectsData);
      
      // Reset form
      setProjectName("");
      setShowCreateProject(false);
    } catch (err) {
      console.error("Failed to create project:", err);
      alert("Failed to create project");
    }
  };

  // Delete Project
  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }
    
    try {
      await api(`projects/${projectId}`, {
        method: "DELETE"
      });
      
      // Refresh projects
      const projectsData = await api<Project[]>("projects");
      setProjects(projectsData);
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project");
    }
  };

  // Open pool settings
  const openPoolSettings = (pool: Pool, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPool(pool);
    setPoolName(pool.name);
    setPoolDescription(pool.description || "");
    setSelectedManagers(pool.managers || []);
    setManagerSearch("");
    setShowPoolSettings(true);
  };

  // Toggle manager selection
  const toggleManager = (memberId: string) => {
    setSelectedManagers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  // Remove manager chip
  const removeManager = (memberId: string) => {
    setSelectedManagers(prev => prev.filter(id => id !== memberId));
  };

  if (loading) {
    return (
      <main style={{
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        padding: "2rem",
        fontFamily: "'Montserrat', sans-serif"
      }}>
        <div style={{ 
          textAlign: "center", 
          padding: "3rem", 
          color: "#888",
          fontSize: "1.2rem"
        }}>
          Loading projects...
        </div>
      </main>
    );
  }

  // If a pool is selected, show projects in that pool
  if (selectedPool) {
    const pool = pools.find(p => p.pool_id === selectedPool);
    const poolProjects = getProjectsForPool(selectedPool);

    return (
      <main style={{
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        padding: "2rem",
        fontFamily: "'Montserrat', sans-serif"
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <button
              onClick={() => setSelectedPool(null)}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#2a2a2a",
                border: "1px solid #3a3a3a",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "1rem",
                color: "#e0e0e0",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: "'Montserrat', sans-serif",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#2d2d2d";
                e.currentTarget.style.borderColor = "#5b1be3";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#2a2a2a";
                e.currentTarget.style.borderColor = "#3a3a3a";
              }}
            >
              ← Back to Pools
            </button>

            {clearance >= 5 && pool && (
              <button
                onClick={(e) => openPoolSettings(pool, e)}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  color: "#e0e0e0",
                  fontFamily: "'Montserrat', sans-serif",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#2d2d2d";
                  e.currentTarget.style.borderColor = "#5b1be3";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#2a2a2a";
                  e.currentTarget.style.borderColor = "#3a3a3a";
                }}
              >
                <Settings size={18} />
                Pool Settings
              </button>
            )}
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <h1 style={{ 
              color: "#8550e9", 
              fontSize: "2.5rem",
              fontWeight: "600",
              letterSpacing: "0.5px",
              marginBottom: "0.5rem" 
            }}>
              {pool?.name}
            </h1>
            {pool?.description && (
              <p style={{ 
                color: "#888", 
                fontSize: "1.1rem",
                lineHeight: "1.6"
              }}>
                {pool.description}
              </p>
            )}
          </div>

          {/* Manager Details Table */}
          {managerDetails.length > 0 && (
            <div style={{ 
              marginBottom: "2rem",
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: "8px",
              overflow: "hidden"
            }}>
              <div style={{ 
                padding: "1rem 1.5rem",
                borderBottom: "1px solid #3a3a3a",
                backgroundColor: "#252525"
              }}>
                <h2 style={{ 
                  color: "#b19cd9",
                  fontSize: "1.25rem",
                  fontWeight: "600"
                }}>
                  Pool Managers
                </h2>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ 
                  width: "100%",
                  borderCollapse: "collapse"
                }}>
                  <thead>
                    <tr style={{ backgroundColor: "#252525" }}>
                      <th style={{ 
                        padding: "1rem 1.5rem",
                        textAlign: "left",
                        color: "#b19cd9",
                        fontWeight: "600",
                        fontSize: "0.9rem",
                        borderBottom: "1px solid #3a3a3a"
                      }}>
                        Name
                      </th>
                      <th style={{ 
                        padding: "1rem 1.5rem",
                        textAlign: "left",
                        color: "#b19cd9",
                        fontWeight: "600",
                        fontSize: "0.9rem",
                        borderBottom: "1px solid #3a3a3a"
                      }}>
                        Department
                      </th>
                      <th style={{ 
                        padding: "1rem 1.5rem",
                        textAlign: "left",
                        color: "#b19cd9",
                        fontWeight: "600",
                        fontSize: "0.9rem",
                        borderBottom: "1px solid #3a3a3a"
                      }}>
                        Phone
                      </th>
                      <th style={{ 
                        padding: "1rem 1.5rem",
                        textAlign: "left",
                        color: "#b19cd9",
                        fontWeight: "600",
                        fontSize: "0.9rem",
                        borderBottom: "1px solid #3a3a3a"
                      }}>
                        Clearance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerDetails.map((manager, index) => (
                      <tr key={manager.member_id} style={{
                        backgroundColor: index % 2 === 0 ? "#2a2a2a" : "#272727"
                      }}>
                        <td style={{ 
                          padding: "1rem 1.5rem",
                          color: "#e0e0e0",
                          borderBottom: index === managerDetails.length - 1 ? "none" : "1px solid #3a3a3a"
                        }}>
                          {manager.name}
                        </td>
                        <td style={{ 
                          padding: "1rem 1.5rem",
                          color: "#c0c0c0",
                          borderBottom: index === managerDetails.length - 1 ? "none" : "1px solid #3a3a3a"
                        }}>
                          {manager.department}
                        </td>
                        <td style={{ 
                          padding: "1rem 1.5rem",
                          color: "#c0c0c0",
                          borderBottom: index === managerDetails.length - 1 ? "none" : "1px solid #3a3a3a"
                        }}>
                          {manager.phone}
                        </td>
                        <td style={{ 
                          padding: "1rem 1.5rem",
                          borderBottom: index === managerDetails.length - 1 ? "none" : "1px solid #3a3a3a"
                        }}>
                          <span style={{
                            padding: "0.25rem 0.75rem",
                            backgroundColor: manager.clearance >= 5 ? "#5b1be3" : "#4a5568",
                            color: "white",
                            borderRadius: "12px",
                            fontSize: "0.85rem",
                            fontWeight: "600"
                          }}>
                            Level {manager.clearance}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Projects Section */}
          <h2 style={{ 
            color: "#b19cd9",
            fontSize: "1.75rem",
            fontWeight: "600",
            marginBottom: "1rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid #3a3a3a"
          }}>
            Projects
          </h2>

          {poolProjects.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "3rem",
              backgroundColor: "#2a2a2a",
              borderRadius: "8px",
              border: "1px solid #3a3a3a"
            }}>
              <p style={{ color: "#888", fontSize: "1.1rem" }}>
                No projects in this pool yet.
              </p>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
              gap: "1.5rem" 
            }}>
              {poolProjects.map(project => (
                <div
                  key={project.project_id}
                  onClick={() => router.push(`/projects/${project.project_id}`)}
                  style={{
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    padding: "1.5rem",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    position: "relative"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = "#2d2d2d";
                    e.currentTarget.style.borderColor = "#5b1be3";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(139, 122, 184, 0.15)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "#2a2a2a";
                    e.currentTarget.style.borderColor = "#3a3a3a";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {clearance >= 5 && (
                    <button
                      onClick={(e) => handleDeleteProject(project.project_id, e)}
                      style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "0.25rem",
                        color: "#888",
                        transition: "color 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "#dc2626"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "#888"}
                      title="Delete project"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  
                  <h3 style={{ 
                    color: "#ffffff",
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "0.75rem",
                    lineHeight: "1.4",
                    paddingRight: clearance >= 5 ? "2rem" : "0"
                  }}>
                    {project.project_name}
                  </h3>
                  {project.description && (
                    <p style={{ 
                      color: "#888", 
                      fontSize: "0.9rem", 
                      lineHeight: "1.5",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {project.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Floating Create Project Button */}
          {clearance >= 5 && (
            <button
              onClick={() => setShowCreateProject(true)}
              style={{
                position: "fixed",
                bottom: "2rem",
                left: "2rem",
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#5b1be3",
                border: "none",
                color: "white",
                fontSize: "2rem",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(91, 27, 227, 0.4)",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#3d17a5";
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#5b1be3";
                e.currentTarget.style.transform = "scale(1)";
              }}
              title="Create new project"
            >
              +
            </button>
          )}
        </div>

        {/* Create Project Modal */}
        {showCreateProject && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem"
          }} onClick={() => setShowCreateProject(false)}>
            <div style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: "8px",
              padding: "2rem",
              maxWidth: "500px",
              width: "100%"
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ color: "#8550e9", marginBottom: "1.5rem", fontSize: "1.5rem" }}>
                Create New Project
              </h2>
              
              <form onSubmit={handleCreateProject}>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", color: "#c0c0c0", marginBottom: "0.5rem" }}>
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "#232323",
                      border: "1px solid #3a3a3a",
                      borderRadius: "4px",
                      color: "#e0e0e0",
                      fontSize: "1rem",
                      fontFamily: "'Montserrat', sans-serif"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateProject(false)}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      backgroundColor: "#2a2a2a",
                      border: "1px solid #3a3a3a",
                      borderRadius: "4px",
                      color: "#e0e0e0",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontFamily: "'Montserrat', sans-serif"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      backgroundColor: "#5b1be3",
                      border: "none",
                      borderRadius: "4px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: "600",
                      fontFamily: "'Montserrat', sans-serif"
                    }}
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pool Settings Modal */}
        {showPoolSettings && currentPool && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem"
          }} onClick={() => setShowPoolSettings(false)}>
            <div style={{
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: "8px",
              padding: "2rem",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto"
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ color: "#8550e9", marginBottom: "1.5rem", fontSize: "1.5rem" }}>
                Pool Settings
              </h2>
              
              <form onSubmit={handleUpdatePool}>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", color: "#c0c0c0", marginBottom: "0.5rem" }}>
                    Pool Name
                  </label>
                  <input
                    type="text"
                    value={poolName}
                    onChange={(e) => setPoolName(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "#232323",
                      border: "1px solid #3a3a3a",
                      borderRadius: "4px",
                      color: "#e0e0e0",
                      fontSize: "1rem",
                      fontFamily: "'Montserrat', sans-serif"
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", color: "#c0c0c0", marginBottom: "0.5rem" }}>
                    Description
                  </label>
                  <textarea
                    value={poolDescription}
                    onChange={(e) => setPoolDescription(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "#232323",
                      border: "1px solid #3a3a3a",
                      borderRadius: "4px",
                      color: "#e0e0e0",
                      fontSize: "1rem",
                      fontFamily: "'Montserrat', sans-serif",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", color: "#c0c0c0", marginBottom: "0.5rem" }}>
                    Managers
                  </label>
                  
                  {/* Selected managers chips */}
                  {selectedManagers.length > 0 && (
                    <div style={{ 
                      display: "flex", 
                      flexWrap: "wrap", 
                      gap: "0.5rem",
                      marginBottom: "0.5rem"
                    }}>
                      {selectedManagers.map(managerId => {
                        const manager = allMembers.find(m => m.member_id === managerId);
                        return manager ? (
                          <div
                            key={managerId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.25rem 0.75rem",
                              backgroundColor: "#5b1be3",
                              color: "white",
                              borderRadius: "12px",
                              fontSize: "0.85rem"
                            }}
                          >
                            {manager.name}
                            <button
                              type="button"
                              onClick={() => removeManager(managerId)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "white",
                                cursor: "pointer",
                                padding: "0",
                                fontSize: "1rem",
                                lineHeight: "1"
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                  
                  {/* Searchable dropdown */}
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={managerSearch}
                      onChange={(e) => setManagerSearch(e.target.value)}
                      onFocus={() => setShowManagerDropdown(true)}
                      placeholder="Search members..."
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        backgroundColor: "#232323",
                        border: "1px solid #3a3a3a",
                        borderRadius: "4px",
                        color: "#e0e0e0",
                        fontSize: "1rem",
                        fontFamily: "'Montserrat', sans-serif"
                      }}
                    />
                    
                    {showManagerDropdown && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        maxHeight: "200px",
                        overflowY: "auto",
                        backgroundColor: "#232323",
                        border: "1px solid #3a3a3a",
                        borderTop: "none",
                        borderRadius: "0 0 4px 4px",
                        zIndex: 10,
                        marginTop: "-4px"
                      }}>
                        {filteredMembers.length === 0 ? (
                          <div style={{ 
                            padding: "0.75rem", 
                            color: "#888",
                            textAlign: "center"
                          }}>
                            No members found
                          </div>
                        ) : (
                          filteredMembers.map(member => (
                            <div
                              key={member.member_id}
                              onClick={() => {
                                toggleManager(member.member_id);
                                setManagerSearch("");
                                setShowManagerDropdown(false);
                              }}
                              style={{
                                padding: "0.75rem",
                                cursor: "pointer",
                                color: selectedManagers.includes(member.member_id) ? "#5b1be3" : "#e0e0e0",
                                backgroundColor: "transparent",
                                transition: "background-color 0.2s ease"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2a2a2a"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                            >
                              {member.name} {selectedManagers.includes(member.member_id) ? "✓" : ""}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowPoolSettings(false)}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      backgroundColor: "#2a2a2a",
                      border: "1px solid #3a3a3a",
                      borderRadius: "4px",
                      color: "#e0e0e0",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontFamily: "'Montserrat', sans-serif"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      backgroundColor: "#5b1be3",
                      border: "none",
                      borderRadius: "4px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: "600",
                      fontFamily: "'Montserrat', sans-serif"
                    }}
                  >
                    Update
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeletePool(currentPool.pool_id)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "transparent",
                    border: "1px solid #dc2626",
                    borderRadius: "4px",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif"
                  }}
                >
                  Delete Pool
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    );
  }

  // Default view: Show all pools
  const projectsWithoutPool = getProjectsWithoutPool();

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#1a1a1a",
      padding: "2rem",
      fontFamily: "'Montserrat', sans-serif"
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto"
      }}>
        <h1 style={{ 
          color: "#8550e9",
          fontSize: "2.5rem",
          fontWeight: "600",
          letterSpacing: "0.5px",
          marginBottom: "2rem"
        }}>
          Projects
        </h1>

        {/* Pools Grid */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
          gap: "1.5rem",
          marginBottom: "3rem"
        }}>
          {pools.map(pool => {
            const poolProjectCount = getProjectsForPool(pool.pool_id).length;
            
            return (
              <div
                key={pool.pool_id}
                onClick={() => setSelectedPool(pool.pool_id)}
                style={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "8px",
                  padding: "2rem",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  position: "relative"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = "#2d2d2d";
                  e.currentTarget.style.borderColor = "#5b1be3";
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(139, 122, 184, 0.2)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = "#2a2a2a";
                  e.currentTarget.style.borderColor = "#3a3a3a";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Project Count Badge */}
                <div style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  backgroundColor: "#5b1be3",
                  color: "white",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "12px",
                  fontSize: "0.85rem",
                  fontWeight: "600"
                }}>
                  {poolProjectCount} {poolProjectCount === 1 ? 'project' : 'projects'}
                </div>

                <h2 style={{ 
                  color: "#b19cd9",
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  paddingRight: "5rem"
                }}>
                  {pool.name}
                </h2>
                
                {pool.description && (
                  <p style={{ 
                    color: "#888", 
                    fontSize: "1rem", 
                    lineHeight: "1.6",
                    marginBottom: "1rem",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}>
                    {pool.description}
                  </p>
                )}

                <div style={{
                  marginTop: "1.5rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid #3a3a3a",
                  color: "#8550e9",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}>
                  View Projects →
                </div>
              </div>
            );
          })}
        </div>

        {/* Projects without a pool */}
        {projectsWithoutPool.length > 0 && (
          <div style={{ marginTop: "3rem" }}>
            <h2 style={{ 
              color: "#b19cd9",
              fontSize: "1.75rem",
              fontWeight: "600",
              marginBottom: "1rem",
              paddingBottom: "0.5rem",
              borderBottom: "1px solid #3a3a3a"
            }}>
              Unassigned Projects
            </h2>
            <p style={{ 
              color: "#888", 
              marginBottom: "1.5rem",
              fontSize: "0.95rem"
            }}>
              These projects are not assigned to any pool.
            </p>
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
              gap: "1.5rem" 
            }}>
              {projectsWithoutPool.map(project => (
                <div
                  key={project.project_id}
                  onClick={() => router.push(`/projects/${project.project_id}`)}
                  style={{
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    padding: "1.5rem",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    position: "relative"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = "#2d2d2d";
                    e.currentTarget.style.borderColor = "#d97706";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(217, 119, 6, 0.15)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = "#2a2a2a";
                    e.currentTarget.style.borderColor = "#3a3a3a";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {clearance >= 5 && (
                    <button
                      onClick={(e) => handleDeleteProject(project.project_id, e)}
                      style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "0.25rem",
                        color: "#888",
                        transition: "color 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "#dc2626"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "#888"}
                      title="Delete project"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                  
                  <h3 style={{ 
                    color: "#ffffff",
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "0.75rem",
                    lineHeight: "1.4",
                    paddingRight: clearance >= 5 ? "2rem" : "0"
                  }}>
                    {project.project_name}
                  </h3>
                  {project.description && (
                    <p style={{ 
                      color: "#888", 
                      fontSize: "0.9rem", 
                      lineHeight: "1.5",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {project.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {pools.length === 0 && projectsWithoutPool.length === 0 && (
          <div style={{ 
            textAlign: "center", 
            padding: "3rem",
            backgroundColor: "#2a2a2a",
            borderRadius: "8px",
            border: "1px solid #3a3a3a"
          }}>
            <p style={{ color: "#888", fontSize: "1.1rem" }}>
              No pools or projects found.
            </p>
          </div>
        )}

        {/* Floating Create Pool Button */}
        {clearance >= 5 && (
          <button
            onClick={() => setShowCreatePool(true)}
            style={{
              position: "fixed",
              bottom: "2rem",
              left: "2rem",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#5b1be3",
              border: "none",
              color: "white",
              fontSize: "2rem",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(91, 27, 227, 0.4)",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#3d17a5";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#5b1be3";
              e.currentTarget.style.transform = "scale(1)";
            }}
            title="Create new pool"
          >
            +
          </button>
        )}
      </div>

      {/* Create Pool Modal */}
      {showCreatePool && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }} onClick={() => setShowCreatePool(false)}>
          <div style={{
            backgroundColor: "#2a2a2a",
            border: "1px solid #3a3a3a",
            borderRadius: "8px",
            padding: "2rem",
            maxWidth: "500px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto"
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: "#8550e9", marginBottom: "1.5rem", fontSize: "1.5rem" }}>
              Create New Pool
            </h2>
            
            <form onSubmit={handleCreatePool}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: "#c0c0c0", marginBottom: "0.5rem" }}>
                  Pool Name
                </label>
                <input
                  type="text"
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "4px",
                    color: "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif"
                  }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: "#c0c0c0", marginBottom: "0.5rem" }}>
                  Description
                </label>
                <textarea
                  value={poolDescription}
                  onChange={(e) => setPoolDescription(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#232323",
                    border: "1px solid #3a3a3a",
                    borderRadius: "4px",
                    color: "#e0e0e0",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", color: "#c0c0c0", marginBottom: "0.5rem" }}>
                  Managers
                </label>
                
                {/* Selected managers chips */}
                {selectedManagers.length > 0 && (
                  <div style={{ 
                    display: "flex", 
                    flexWrap: "wrap", 
                    gap: "0.5rem",
                    marginBottom: "0.5rem"
                  }}>
                    {selectedManagers.map(managerId => {
                      const manager = allMembers.find(m => m.member_id === managerId);
                      return manager ? (
                        <div
                          key={managerId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            padding: "0.25rem 0.75rem",
                            backgroundColor: "#5b1be3",
                            color: "white",
                            borderRadius: "12px",
                            fontSize: "0.85rem"
                          }}
                        >
                          {manager.name}
                          <button
                            type="button"
                            onClick={() => removeManager(managerId)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "white",
                              cursor: "pointer",
                              padding: "0",
                              fontSize: "1rem",
                              lineHeight: "1"
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
                
                {/* Searchable dropdown */}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={managerSearch}
                    onChange={(e) => setManagerSearch(e.target.value)}
                    onFocus={() => setShowManagerDropdown(true)}
                    placeholder="Search members..."
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "#232323",
                      border: "1px solid #3a3a3a",
                      borderRadius: "4px",
                      color: "#e0e0e0",
                      fontSize: "1rem",
                      fontFamily: "'Montserrat', sans-serif"
                    }}
                  />
                  
                  {showManagerDropdown && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      maxHeight: "200px",
                      overflowY: "auto",
                      backgroundColor: "#232323",
                      border: "1px solid #3a3a3a",
                      borderTop: "none",
                      borderRadius: "0 0 4px 4px",
                      zIndex: 10,
                      marginTop: "-4px"
                    }}>
                      {filteredMembers.length === 0 ? (
                        <div style={{ 
                          padding: "0.75rem", 
                          color: "#888",
                          textAlign: "center"
                        }}>
                          No members found
                        </div>
                      ) : (
                        filteredMembers.map(member => (
                          <div
                            key={member.member_id}
                            onClick={() => {
                              toggleManager(member.member_id);
                              setManagerSearch("");
                              setShowManagerDropdown(false);
                            }}
                            style={{
                              padding: "0.75rem",
                              cursor: "pointer",
                              color: selectedManagers.includes(member.member_id) ? "#5b1be3" : "#e0e0e0",
                              backgroundColor: "transparent",
                              transition: "background-color 0.2s ease"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2a2a2a"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                          >
                            {member.name} {selectedManagers.includes(member.member_id) ? "✓" : ""}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreatePool(false)}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: "4px",
                    color: "#e0e0e0",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    backgroundColor: "#5b1be3",
                    border: "none",
                    borderRadius: "4px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: "'Montserrat', sans-serif"
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}