// app/projects/page.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useRouter } from "next/navigation";

interface Project {
  project_id: string;
  project_name: string;
  description?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  useEffect(() => {
    api<Project[]>("projects").then(setProjects);
  }, []);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Projects</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem", marginTop: "2rem" }}>
        {projects.map(project => (
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
            <h3 style={{ marginBottom: "0.5rem" }}>{project.project_name}</h3>
            {project.description && (
              <p style={{ color: "#666", fontSize: "0.9em" }}>{project.description}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}