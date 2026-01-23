// app/projects/[project_id]/page.tsx

"use client";

import { use, useState, useEffect, useCallback } from "react";
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
  price: string | null;
}

interface GitHubIssue {
  id: number;
  title: string;
  html_url: string;
  state: string;
  created_at: string;
  pull_request?: any;
  assignee?: {
    login: string;
    avatar_url: string;
  };
  assignees: {
    login: string;
  }[];
}

interface GitHubPR {
  id: number;
  title: string;
  html_url: string;
  state: string;
  merged_at?: string;
  user: {
    login: string;
  };
}

interface GitHubContributor {
  login: string;
  contributions: number;
  avatar_url: string;
}

type TabType = "analytics" | "notion" | "github" | "docs" | "settings";

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        top: "2rem",
        right: "2rem",
        padding: "1rem 1.5rem",
        backgroundColor: type === "success" ? "#4CAF50" : "#f44336",
        color: "white",
        borderRadius: "4px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        zIndex: 1000,
        animation: "slideIn 0.3s ease-out"
      }}
    >
      {message}
    </div>
  );
}

export default function ProjectPage({ params }: Props) {
  const { project_id } = use(params);
  const [activeTab, setActiveTab] = useState<TabType>("analytics");
  const [project, setProject] = useState<Project | null>(null);
  const [analytics, setAnalytics] = useState<ProjectItem[]>([]);
  const [githubIssues, setGithubIssues] = useState<GitHubIssue[]>([]);
  const [githubPRs, setGithubPRs] = useState<GitHubPR[]>([]);
  const [githubContributors, setGithubContributors] = useState<GitHubContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  
  // Settings form state
  const [editedProject, setEditedProject] = useState<Project | null>(null);
  const [newDocName, setNewDocName] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const fetchGitHubData = useCallback(async (repoName: string) => {
    setGithubLoading(true);
    setGithubError(null);
    
    try {
      const [allIssues, prs, contributors] = await Promise.all([
        api<GitHubIssue[]>(`github/${repoName}`),
        api<GitHubPR[]>(`github/${repoName}/pulls`),
        api<GitHubContributor[]>(`github/${repoName}/contributors`)
      ]);
      
      const issuesOnly = allIssues.filter(issue => !issue.pull_request);
      setGithubIssues(issuesOnly);
      setGithubPRs(prs);
      setGithubContributors(contributors);
    } catch (err) {
      console.error("Failed to fetch GitHub data:", err);
      setGithubError(err instanceof Error ? err.message : "Failed to load GitHub data");
    } finally {
      setGithubLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchProjectData() {
      try {
        const projectData = await api<Project>(`projects/${project_id}`);
        setProject(projectData);
        setEditedProject(projectData);

        // Fetch analytics
        const analyticsData = await api<ProjectItem[]>(`projects/${project_id}/analytics`);
        setAnalytics(analyticsData);

        // Fetch GitHub data if repo is configured
        if (projectData.github_repo) {
          await fetchGitHubData(projectData.github_repo);
        }
      } catch (err) {
        console.error("Failed to load project:", err);
        showToast("Failed to load project data", "error");
      } finally {
        setLoading(false);
      }
    }

    fetchProjectData();
  }, [project_id, fetchGitHubData, showToast]);

  const handleSaveSettings = async () => {
    if (!editedProject) return;
    
    setSaving(true);
    try {
      await api(`projects/${project_id}`, {
        method: "PATCH",
        body: JSON.stringify(editedProject)
      });
      
      const oldRepo = project?.github_repo;
      const newRepo = editedProject.github_repo;
      
      setProject(editedProject);
      showToast("Settings saved successfully!", "success");
      
      // Refetch GitHub data if repo changed
      if (oldRepo !== newRepo && newRepo) {
        await fetchGitHubData(newRepo);
      } else if (!newRepo) {
        // Clear GitHub data if repo was removed
        setGithubIssues([]);
        setGithubPRs([]);
        setGithubContributors([]);
        setGithubError(null);
      }
    } catch (err) {
      showToast("Failed to save settings: " + (err instanceof Error ? err.message : "Unknown error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDoc = () => {
    if (!newDocName || !newDocUrl || !editedProject) return;
    
    const updatedDocs = [...(editedProject.doc_urls || []), { name: newDocName, url: newDocUrl }];
    setEditedProject({ ...editedProject, doc_urls: updatedDocs });
    setNewDocName("");
    setNewDocUrl("");
  };

  const handleRemoveDoc = (index: number) => {
    if (!editedProject) return;
    const updatedDocs = editedProject.doc_urls?.filter((_, i) => i !== index) || [];
    setEditedProject({ ...editedProject, doc_urls: updatedDocs });
  };

  if (loading) {
    return (
      <main style={{ padding: "2rem", display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.2rem", color: "#666" }}>Loading project...</div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main style={{ padding: "2rem" }}>
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <h2>Project not found</h2>
          <p style={{ color: "#666" }}>The requested project could not be found.</p>
        </div>
      </main>
    );
  }

  // GitHub stats
  const openIssues = githubIssues.filter(i => i.state === "open").length;
  const closedIssues = githubIssues.filter(i => i.state === "closed").length;
  const openPRs = githubPRs.filter(pr => pr.state === "open").length;
  const closedPRs = githubPRs.filter(pr => pr.state === "closed" && !pr.merged_at).length;
  const mergedPRs = githubPRs.filter(pr => pr.merged_at).length;

  return (
    <main style={{ padding: "2rem" }}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <h1 style={{ marginBottom: "2rem" }}>{project.project_name}</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "1rem", borderBottom: "2px solid #ccc", marginBottom: "2rem" }}>
        <TabButton active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")}>
          Analytics
        </TabButton>
        {project.notion_page_id && (
          <TabButton active={activeTab === "notion"} onClick={() => setActiveTab("notion")}>
            Notion
          </TabButton>
        )}
        {project.github_repo && (
          <TabButton active={activeTab === "github"} onClick={() => setActiveTab("github")}>
            GitHub
          </TabButton>
        )}
        {project.doc_urls && project.doc_urls.length > 0 && (
          <TabButton active={activeTab === "docs"} onClick={() => setActiveTab("docs")}>
            Docs
          </TabButton>
        )}
        <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>
          Settings
        </TabButton>
      </div>

      {/* Analytics Tab */}
      <TabPanel active={activeTab === "analytics"}>
        <h2>Items Issued to Project</h2>
        {analytics.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No items have been issued to this project yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "1rem", textAlign: "left", border: "1px solid #ddd" }}>Item No</th>
                <th style={{ padding: "1rem", textAlign: "left", border: "1px solid #ddd" }}>Item Name</th>
                <th style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>Quantity Issued</th>
                <th style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map(item => (
                <tr key={item.item_no} style={{ transition: "background-color 0.2s" }}>
                  <td style={{ padding: "1rem", border: "1px solid #ddd" }}>{item.item_no}</td>
                  <td style={{ padding: "1rem", border: "1px solid #ddd" }}>{item.item_name}</td>
                  <td style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>
                    {item.total_quantity}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "right", border: "1px solid #ddd" }}>
                    {item.price || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TabPanel>

      {/* Notion Tab */}
      {project.notion_page_id && (
        <TabPanel active={activeTab === "notion"}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>Notion Workspace</h2>
            <a
              href={project.notion_page_id}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#000",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
                fontSize: "0.9rem"
              }}
            >
              Open in Notion →
            </a>
          </div>
          <iframe
            src={project.notion_page_id}
            style={{
              width: "100%",
              height: "800px",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
            title="Notion Page"
          />
        </TabPanel>
      )}

      {/* GitHub Tab */}
      {project.github_repo && (
        <TabPanel active={activeTab === "github"}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <h2>GitHub Analytics</h2>
            <a
              href={`https://github.com/${project.github_repo}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#24292e",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
                fontSize: "0.9rem"
              }}
            >
              Go to Repository →
            </a>
          </div>
          
          {githubLoading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
              Loading GitHub data...
            </div>
          ) : githubError ? (
            <div style={{ 
              padding: "1rem", 
              backgroundColor: "#ffebee", 
              border: "1px solid #f44336", 
              borderRadius: "4px",
              marginBottom: "1rem"
            }}>
              <strong>Error loading GitHub data:</strong> {githubError}
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <StatCard title="Issues" primary={`${openIssues} Open`} secondary={`${closedIssues} Closed`} />
                <StatCard 
                  title="Pull Requests" 
                  primary={`${openPRs} Open`} 
                  secondary={`${mergedPRs} Merged / ${closedPRs} Closed`} 
                />
              </div>

              {/* Contributors Bar Chart */}
              {githubContributors.length > 0 && (
                <ContributorsChart contributors={githubContributors} />
              )}

              {/* Open Issues List */}
              <IssuesList issues={githubIssues.filter(i => i.state === "open")} />
            </>
          )}
        </TabPanel>
      )}

      {/* Docs Tab */}
      {project.doc_urls && project.doc_urls.length > 0 && (
        <TabPanel active={activeTab === "docs"}>
          <h2>Documentation & Resources</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
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
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f0f0f0";
                  e.currentTarget.style.borderColor = "#2196F3";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9f9f9";
                  e.currentTarget.style.borderColor = "#ccc";
                }}
              >
                <span style={{ fontSize: "1.1rem", fontWeight: "500" }}>{doc.name}</span>
                <span style={{ color: "#2196F3" }}>Open →</span>
              </a>
            ))}
          </div>
        </TabPanel>
      )}

      {/* Settings Tab */}
      <TabPanel active={activeTab === "settings"}>
        <h2>Project Settings</h2>
        
        {editedProject && (
          <div style={{ maxWidth: "600px", marginTop: "1.5rem" }}>
            <FormField
              label="Project Name"
              value={editedProject.project_name}
              onChange={(value) => setEditedProject({ ...editedProject, project_name: value })}
            />

            <FormField
              label="Notion Page URL"
              value={editedProject.notion_page_id || ""}
              onChange={(value) => setEditedProject({ ...editedProject, notion_page_id: value })}
              placeholder="https://notion.so/..."
            />

            <FormField
              label="GitHub Repository (owner/repo)"
              value={editedProject.github_repo || ""}
              onChange={(value) => setEditedProject({ ...editedProject, github_repo: value })}
              placeholder="username/repository"
            />

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Documentation Links
              </label>
              
              {editedProject.doc_urls && editedProject.doc_urls.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  {editedProject.doc_urls.map((doc, idx) => (
                    <div key={idx} style={{ 
                      display: "flex", 
                      gap: "0.5rem", 
                      marginBottom: "0.5rem",
                      padding: "0.5rem",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      alignItems: "center"
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "500" }}>{doc.name}</div>
                        <div style={{ fontSize: "0.9rem", color: "#666", wordBreak: "break-all" }}>
                          {doc.url}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveDoc(idx)}
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: "#f44336",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Document name"
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                  }}
                />
                <input
                  type="text"
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px"
                  }}
                />
                <button
                  onClick={handleAddDoc}
                  disabled={!newDocName || !newDocUrl}
                  style={{
                    padding: "0.75rem 1rem",
                    backgroundColor: newDocName && newDocUrl ? "#4CAF50" : "#ccc",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: newDocName && newDocUrl ? "pointer" : "not-allowed"
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              style={{
                padding: "1rem 2rem",
                backgroundColor: saving ? "#ccc" : "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: "500"
              }}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        )}
      </TabPanel>
    </main>
  );
}

// Helper Components
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "1rem 2rem",
        border: "none",
        backgroundColor: "transparent",
        borderBottom: active ? "3px solid #4CAF50" : "none",
        cursor: "pointer",
        fontWeight: active ? "bold" : "normal",
        transition: "all 0.2s"
      }}
    >
      {children}
    </button>
  );
}

function TabPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <div style={{ display: active ? "block" : "none" }}>{children}</div>;
}

function FormField({ 
  label, 
  value, 
  onChange, 
  placeholder 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "0.75rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
          fontSize: "1rem"
        }}
      />
    </div>
  );
}

function StatCard({ title, primary, secondary }: { title: string; primary: string; secondary: string }) {
  return (
    <div style={{ padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "#666" }}>{title}</h3>
      <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>{primary}</div>
      <div style={{ fontSize: "0.9rem", color: "#666" }}>{secondary}</div>
    </div>
  );
}

function ContributorsChart({ contributors }: { contributors: GitHubContributor[] }) {
  const maxContributions = Math.max(...contributors.map(c => c.contributions));
  
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3 style={{ marginBottom: "1rem" }}>Top Contributors</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {contributors.map(contributor => {
          const widthPercent = (contributor.contributions / maxContributions) * 100;
          
          return (
            <div key={contributor.login} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <img 
                src={contributor.avatar_url} 
                alt={contributor.login}
                style={{ width: "32px", height: "32px", borderRadius: "50%" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>{contributor.login}</div>
                <div style={{ 
                  height: "24px", 
                  backgroundColor: "#e0e0e0", 
                  borderRadius: "4px",
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    width: `${widthPercent}%`,
                    backgroundColor: "#4CAF50",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: "0.5rem",
                    color: "white",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    transition: "width 0.3s ease"
                  }}>
                    {contributor.contributions}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IssuesList({ issues }: { issues: GitHubIssue[] }) {
  return (
    <div>
      <h3 style={{ marginBottom: "1rem" }}>Open Issues</h3>
      {issues.length === 0 ? (
        <p style={{ color: "#666", fontStyle: "italic" }}>No open issues found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {issues.map(issue => (
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
              <div style={{ flex: 1, marginRight: "1rem" }}>
                <a
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "1.1rem", fontWeight: "500", color: "#2196F3", textDecoration: "none" }}
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
                  whiteSpace: "nowrap"
                }}
              >
                View on GitHub
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}