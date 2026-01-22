// app/projects/[project_id]/page.tsx

"use client";

import { use, useState, useEffect } from "react";
import { api } from "@/app/lib/api";

interface Props {
  params: Promise<{ project_id: string }>;
}

interface Project {
  project_id: string;
  project_name: string;
  notion_page_id?: string;
  github_repo?: string;
  doc_urls?: { name: string; url: string }[];
}

interface ProjectItem {
  item_no: string;
  item_name: string;
  total_quantity: number;
  price: number;
}

interface GitHubIssue {
  id: number;
  title: string;
  html_url: string;
  assignee?: {
    login: string;
    avatar_url: string;
  };
  assignees: {
    login: string;
  }[];
}

export default function ProjectPage({ params }: Props) {
  const { project_id } = use(params);
  const [activeTab, setActiveTab] = useState<"notion" | "github" | "docs" | "analytics">("analytics");
  const [project, setProject] = useState<Project | null>(null);
  const [analytics, setAnalytics] = useState<ProjectItem[]>([]);
  const [githubIssues, setGithubIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjectData() {
      try {
        const projectData = await api<Project>(`projects/${project_id}`);
        setProject(projectData);

        // Fetch analytics
        const analyticsData = await api<ProjectItem[]>(`projects/${project_id}/analytics`);
        setAnalytics(analyticsData);

        // Fetch GitHub issues if repo is configured
        if (projectData.github_repo) {
          try {
            const issues = await api<GitHubIssue[]>(`github/${projectData.github_repo}`);
            setGithubIssues(issues);
          } catch (err) {
            console.error("Failed to fetch GitHub issues:", err);
          }
        }
      } catch (err) {
        console.error("Failed to load project:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProjectData();
  }, [project_id]);

  if (loading) {
    return <main style={{ padding: "2rem" }}>Loading...</main>;
  }

  if (!project) {
    return <main style={{ padding: "2rem" }}>Project not found</main>;
  }

  const totalCost = analytics.reduce((sum, item) => sum + (item.total_quantity * item.price), 0);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>{project.project_name}</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", borderBottom: "2px solid #ccc", marginBottom: "2rem" }}>
        <button
          onClick={() => setActiveTab("analytics")}
          style={{
            padding: "1rem 2rem",
            border: "none",
            backgroundColor: "transparent",
            borderBottom: activeTab === "analytics" ? "3px solid #4CAF50" : "none",
            cursor: "pointer",
            fontWeight: activeTab === "analytics" ? "bold" : "normal",
          }}
        >
          Analytics
        </button>
        {project.notion_page_id && (
          <button
            onClick={() => setActiveTab("notion")}
            style={{
              padding: "1rem 2rem",
              border: "none",
              backgroundColor: "transparent",
              borderBottom: activeTab === "notion" ? "3px solid #4CAF50" : "none",
              cursor: "pointer",
              fontWeight: activeTab === "notion" ? "bold" : "normal",
            }}
          >
            Notion
          </button>
        )}
        {project.github_repo && (
          <button
            onClick={() => setActiveTab("github")}
            style={{
              padding: "1rem 2rem",
              border: "none",
              backgroundColor: "transparent",
              borderBottom: activeTab === "github" ? "3px solid #4CAF50" : "none",
              cursor: "pointer",
              fontWeight: activeTab === "github" ? "bold" : "normal",
            }}
          >
            GitHub
          </button>
        )}
        {project.doc_urls && project.doc_urls.length > 0 && (
          <button
            onClick={() => setActiveTab("docs")}
            style={{
              padding: "1rem 2rem",
              border: "none",
              backgroundColor: "transparent",
              borderBottom: activeTab === "docs" ? "3px solid #4CAF50" : "none",
              cursor: "pointer",
              fontWeight: activeTab === "docs" ? "bold" : "normal",
            }}
          >
            Docs
          </button>
        )}
      </div>

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div>
          <h2>Project Analytics</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "1rem", textAlign: "left", border: "1px solid #ddd" }}>Item No</th>
                <th style={{ padding: "1rem", textAlign: "left", border: "1px solid #ddd" }}>Item Name</th>
                <th style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>Total Quantity</th>
                <th style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>Unit Price</th>
                <th style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map(item => (
                <tr key={item.item_no}>
                  <td style={{ padding: "1rem", border: "1px solid #ddd" }}>{item.item_no}</td>
                  <td style={{ padding: "1rem", border: "1px solid #ddd" }}>{item.item_name}</td>
                  <td style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>
                    {item.total_quantity}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>
                    ₹{(item.total_quantity * item.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: "#e8f5e9", fontWeight: "bold" }}>
                <td colSpan={4} style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>
                  Total Project Cost:
                </td>
                <td style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>
                  ₹{totalCost.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Notion Tab */}
      {activeTab === "notion" && project.notion_page_id && (
        <div>
          <h2>Notion Workspace</h2>
          <iframe
            src={`https://notion.so/${project.notion_page_id}`}
            style={{
              width: "100%",
              height: "800px",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
            title="Notion Page"
          />
        </div>
      )}

      {/* GitHub Tab */}
      {activeTab === "github" && project.github_repo && (
        <div>
          <h2>GitHub Issues</h2>
          {githubIssues.length === 0 ? (
            <p>No open issues found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {githubIssues.map(issue => (
                <div
                  key={issue.id}
                  style={{
                    border: "1px solid #ccc",
                    padding: "1rem",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <a
                      href={issue.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "1.1rem", fontWeight: "500", color: "#2196F3" }}
                    >
                      {issue.title}
                    </a>
                    {issue.assignees.length > 0 && (
                      <div style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#666" }}>
                        Assignees: {issue.assignees.map(a => a.login).join(", ")}
                      </div>
                    )}
                  </div>
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#2196F3",
                      color: "white",
                      textDecoration: "none",
                      borderRadius: "4px",
                    }}
                  >
                    View on GitHub
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Docs Tab */}
      {activeTab === "docs" && project.doc_urls && project.doc_urls.length > 0 && (
        <div>
          <h2>Documentation & Resources</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {project.doc_urls.map((doc, idx) => (
              <a
                key={idx}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "1.5rem",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  textDecoration: "none",
                  color: "#333",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f9f9f9",
                }}
              >
                <span style={{ fontSize: "1.1rem", fontWeight: "500" }}>{doc.name}</span>
                <span style={{ color: "#2196F3" }}>Open →</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}