// app/projects/page.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useRouter } from "next/navigation";

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
  managers?: string[] | { member_id: string; name: string }[];
  created_at?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [projectsData, poolsData] = await Promise.all([
          api<Project[]>("projects"),
          api<Pool[]>("pools")
        ]);
        setProjects(projectsData);
        setPools(poolsData);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Get projects for a specific pool
  const getProjectsForPool = (poolId: string) => {
    return projects.filter(p => p.pool === poolId);
  };

  // Get projects without a pool
  const getProjectsWithoutPool = () => {
    return projects.filter(p => !p.pool);
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
              marginBottom: "2rem",
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
                  <h3 style={{ 
                    color: "#ffffff",
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "0.75rem",
                    lineHeight: "1.4"
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
        </div>
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
                  paddingRight: "5rem" // Space for badge
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
                    transition: "all 0.3s ease"
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
                  <h3 style={{ 
                    color: "#ffffff",
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "0.75rem",
                    lineHeight: "1.4"
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
      </div>
    </main>
  );
}