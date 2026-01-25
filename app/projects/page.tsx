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
      <main style={{ padding: "2rem" }}>
        <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
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
      <main style={{ padding: "2rem" }}>
        <button
          onClick={() => setSelectedPool(null)}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e8e8e8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
          }}
        >
          ← Back to Pools
        </button>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ marginBottom: "0.5rem" }}>{pool?.name}</h1>
          {pool?.description && (
            <p style={{ color: "#666", fontSize: "1.1rem" }}>{pool.description}</p>
          )}
        </div>

        {poolProjects.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            padding: "3rem", 
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            border: "1px solid #e0e0e0"
          }}>
            <p style={{ color: "#888", fontSize: "1.1rem" }}>No projects in this pool yet.</p>
          </div>
        ) : (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
            gap: "1rem" 
          }}>
            {poolProjects.map(project => (
              <div
                key={project.project_id}
                onClick={() => router.push(`/projects/${project.project_id}`)}
                style={{
                  border: "1px solid #ccc",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: "#f9f9f9",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = "#e8f5e9";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = "#f9f9f9";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <h3 style={{ marginBottom: "0.5rem", color: "#333" }}>
                  {project.project_name}
                </h3>
                {project.description && (
                  <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: "1.5" }}>
                    {project.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  // Default view: Show all pools
  const projectsWithoutPool = getProjectsWithoutPool();

  return (
    <main style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "2rem" }}>Project Pools</h1>

      {/* Pools Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", 
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
                border: "2px solid #e0e0e0",
                padding: "2rem",
                borderRadius: "12px",
                cursor: "pointer",
                backgroundColor: "#ffffff",
                transition: "all 0.3s",
                position: "relative"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#4CAF50";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(76, 175, 80, 0.2)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#e0e0e0";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Project Count Badge */}
              <div style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                backgroundColor: "#4CAF50",
                color: "white",
                padding: "0.25rem 0.75rem",
                borderRadius: "12px",
                fontSize: "0.85rem",
                fontWeight: "600"
              }}>
                {poolProjectCount} {poolProjectCount === 1 ? 'project' : 'projects'}
              </div>

              <h2 style={{ 
                marginBottom: "1rem", 
                color: "#2c3e50",
                fontSize: "1.5rem",
                paddingRight: "5rem" // Space for badge
              }}>
                {pool.name}
              </h2>
              
              {pool.description && (
                <p style={{ 
                  color: "#666", 
                  fontSize: "1rem", 
                  lineHeight: "1.6",
                  marginBottom: "1rem"
                }}>
                  {pool.description}
                </p>
              )}

              <div style={{
                marginTop: "1.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid #e0e0e0",
                color: "#4CAF50",
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
            marginBottom: "1rem",
            paddingBottom: "0.5rem",
            borderBottom: "2px solid #e0e0e0"
          }}>
            Unassigned Projects
          </h2>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            These projects are not assigned to any pool.
          </p>
          
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
            gap: "1rem" 
          }}>
            {projectsWithoutPool.map(project => (
              <div
                key={project.project_id}
                onClick={() => router.push(`/projects/${project.project_id}`)}
                style={{
                  border: "1px solid #ccc",
                  padding: "1.5rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: "#f9f9f9",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = "#fff3e0";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = "#f9f9f9";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <h3 style={{ marginBottom: "0.5rem", color: "#333" }}>
                  {project.project_name}
                </h3>
                {project.description && (
                  <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: "1.5" }}>
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
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          border: "1px solid #e0e0e0"
        }}>
          <p style={{ color: "#888", fontSize: "1.1rem" }}>No pools or projects found.</p>
        </div>
      )}
    </main>
  );
}