// app/projects/[project_id]/page.tsx

"use client";

import { use, useState, useEffect, useCallback } from "react";
import { api } from "@/app/lib/api";
import { FileChartColumn, NotebookPen, Github, FolderOpen, Settings } from "lucide-react";

interface Props {
  params: Promise<{ project_id: string }>;
}

interface Project {
  project_id: string;
  project_name: string;
  notion_page_id?: string;
  github_repo?: string;
  doc_urls?: { name: string; url: string }[];
  description?: string;
  members?: string[];
  managers?: string[];
  pool?: string;
}

interface Member {
  member_id: string;
  name: string;
  phone?: string;
  email?: string;
  [key: string]: string | undefined;
}

interface Pool {
  pool_id: string;
  name: string;
  description?: string;
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
  pull_request?: {
    url: string;
    html_url: string;
  };
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

type TabType = "overview" | "notion" | "github" | "docs" | "settings";

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
        borderRadius: "6px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
        zIndex: 1000,
        fontFamily: "'Montserrat', sans-serif"
      }}
    >
      {message}
    </div>
  );
}

export default function ProjectPage({ params }: Props) {
  const { project_id } = use(params);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [analytics, setAnalytics] = useState<ProjectItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [poolInfo, setPoolInfo] = useState<Pool | null>(null);
  const [githubIssues, setGithubIssues] = useState<GitHubIssue[]>([]);
  const [githubPRs, setGithubPRs] = useState<GitHubPR[]>([]);
  const [githubContributors, setGithubContributors] = useState<GitHubContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
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

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
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

        // Fetch ALL members from the system first
        try {
          const allMembersData = await api<Member[]>(`members`);
          setAllMembers(allMembersData);
          
          // Filter to get only project members from allMembers (this includes department)
          if (projectData.members && projectData.members.length > 0) {
            const allMemberIds = [
              ...(projectData.managers || []),
              ...(projectData.members || [])
            ];
            const uniqueMemberIds = new Set(allMemberIds);
            const projectMembers = allMembersData.filter(m => uniqueMemberIds.has(m.member_id));
            setMembers(projectMembers);
          }
        } catch (err) {
          console.error("Failed to fetch all members:", err);
        }

        // Fetch pool info if pool ID is available
        if (projectData.pool) {
          try {
            const poolData = await api<Pool>(`pool/${projectData.pool}`);
            setPoolInfo(poolData);
          } catch (err) {
            console.error("Failed to fetch pool:", err);
          }
        }

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
      <main style={{ 
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        padding: "2rem",
        fontFamily: "'Montserrat', sans-serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <div style={{ textAlign: "center", color: "#888", fontSize: "1.2rem" }}>
          Loading project...
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main style={{
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        padding: "2rem",
        fontFamily: "'Montserrat', sans-serif"
      }}>
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <h2 style={{ color: "#e0e0e0" }}>Project not found</h2>
          <p style={{ color: "#888" }}>The requested project could not be found.</p>
        </div>
      </main>
    );
  }

  // Separate managers and regular members
  const managerIds = new Set(project.managers || []);
  const managerMembers = members.filter(m => managerIds.has(m.member_id));
  const regularMembers = members.filter(m => !managerIds.has(m.member_id));
  
  // Get all unique keys from members data (for dynamic columns), excluding member_id and password
  const memberKeys = members.length > 0 
    ? Array.from(new Set(members.flatMap(m => Object.keys(m)))).filter(key => key !== 'member_id' && key !== 'password')
    : [];

  // GitHub stats
  const openIssues = githubIssues.filter(i => i.state === "open").length;
  const closedIssues = githubIssues.filter(i => i.state === "closed").length;
  const openPRs = githubPRs.filter(pr => pr.state === "open").length;
  const closedPRs = githubPRs.filter(pr => pr.state === "closed" && !pr.merged_at).length;
  const mergedPRs = githubPRs.filter(pr => pr.merged_at).length;

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#1a1a1a",
      padding: "2rem",
      fontFamily: "'Montserrat', sans-serif",
      color: "#e0e0e0"
    }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ 
            margin: 0,
            color: "#8550e9",
            fontSize: "2.5rem",
            fontWeight: "600",
            letterSpacing: "0.5px"
          }}>
            {project.project_name}
          </h1>
          {/* {poolInfo && (
            <div style={{ 
              padding: "0.5rem 1rem", 
              backgroundColor: "#2a2a2a",
              border: "1px solid #5b1be3",
              borderRadius: "6px",
              fontSize: "0.9rem",
              color: "#b19cd9"
            }}>
              Pool: <strong style={{ color: "#8550e9" }}>{poolInfo.name}</strong>
            </div>
          )} */}
        </div>

        {/* Tabs */}
        <div style={{ 
          display: "flex", 
          gap: "0.5rem", 
          borderBottom: "2px solid #3a3a3a", 
          marginBottom: "2rem",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch"
        }}>
          <TabButton 
            active={activeTab === "overview"} 
            onClick={() => setActiveTab("overview")}
            icon={<FileChartColumn size={20} />}
            isMobile={isMobile}
          >
            Overview
          </TabButton>
          {project.notion_page_id && (
            <TabButton 
              active={activeTab === "notion"} 
              onClick={() => setActiveTab("notion")}
              icon={<NotebookPen size={20} />}
              isMobile={isMobile}
            >
              Notion
            </TabButton>
          )}
          {project.github_repo && (
            <TabButton 
              active={activeTab === "github"} 
              onClick={() => setActiveTab("github")}
              icon={<Github size={20} />}
              isMobile={isMobile}
            >
              GitHub
            </TabButton>
          )}
          {project.doc_urls && project.doc_urls.length > 0 && (
            <TabButton 
              active={activeTab === "docs"} 
              onClick={() => setActiveTab("docs")}
              icon={<FolderOpen size={20} />}
              isMobile={isMobile}
            >
              Docs
            </TabButton>
          )}
          <TabButton 
            active={activeTab === "settings"} 
            onClick={() => setActiveTab("settings")}
            icon={<Settings size={20} />}
            isMobile={isMobile}
          >
            Settings
          </TabButton>
        </div>

        {/* Overview Tab */}
        <TabPanel active={activeTab === "overview"}>
          {/* Description Section */}
          {project.description && (
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ color: "#b19cd9", marginBottom: "1rem" }}>Description</h2>
              <p style={{ 
                color: "#c0c0c0", 
                lineHeight: "1.6", 
                fontSize: "1rem",
                backgroundColor: "#2a2a2a",
                padding: "1.5rem",
                borderRadius: "6px",
                border: "1px solid #3a3a3a"
              }}>
                {project.description}
              </p>
            </div>
          )}

          {/* Team Members Section */}
          {members.length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ color: "#b19cd9", marginBottom: "1rem" }}>Team Members</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#2a2a2a" }}>
                      {memberKeys.map(key => (
                        <th key={key} style={{ 
                          padding: "1rem", 
                          textAlign: "left", 
                          border: "1px solid #3a3a3a",
                          textTransform: "capitalize",
                          fontWeight: "600",
                          color: "#b19cd9"
                        }}>
                          {key.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Managers first - highlighted */}
                    {managerMembers.map(member => (
                      <tr key={member.member_id} style={{ backgroundColor: "#3a2a2a" }}>
                        {memberKeys.map(key => (
                          <td key={key} style={{ 
                            padding: "1rem", 
                            border: "1px solid #3a3a3a",
                            fontWeight: key === 'name' ? "600" : "normal",
                            color: key === 'name' ? "#e0e0e0" : "#c0c0c0"
                          }}>
                            {member[key] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Regular members */}
                    {regularMembers.map(member => (
                      <tr key={member.member_id} style={{ backgroundColor: "#232323" }}>
                        {memberKeys.map(key => (
                          <td key={key} style={{ 
                            padding: "1rem", 
                            border: "1px solid #3a3a3a",
                            fontWeight: key === 'name' ? "600" : "normal",
                            color: key === 'name' ? "#e0e0e0" : "#c0c0c0"
                          }}>
                            {member[key] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Legend */}
              <div style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#888" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ 
                    width: "20px", 
                    height: "20px", 
                    backgroundColor: "#3a2a2a", 
                    border: "1px solid #3a3a3a",
                    borderRadius: "2px"
                  }} />
                  <span>Manager</span>
                </div>
              </div>
            </div>
          )}

          {/* Items Issued Section */}
          <div>
            <h2 style={{ color: "#b19cd9", marginBottom: "1rem" }}>Items Issued to Project</h2>
            {analytics.length === 0 ? (
              <p style={{ color: "#888", fontStyle: "italic" }}>No items have been issued to this project yet.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#2a2a2a" }}>
                      <th style={{ padding: "1rem", textAlign: "left", border: "1px solid #3a3a3a", color: "#b19cd9" }}>Item No</th>
                      <th style={{ padding: "1rem", textAlign: "left", border: "1px solid #3a3a3a", color: "#b19cd9" }}>Item Name</th>
                      <th style={{ padding: "1rem", textAlign: "right", border: "1px solid #3a3a3a", color: "#b19cd9" }}>Quantity Issued</th>
                      <th style={{ padding: "1rem", textAlign: "right", border: "1px solid #3a3a3a", color: "#b19cd9" }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map(item => (
                      <tr key={item.item_no} style={{ backgroundColor: "#232323", transition: "background-color 0.2s" }}>
                        <td style={{ padding: "1rem", border: "1px solid #3a3a3a", color: "#c0c0c0" }}>{item.item_no}</td>
                        <td style={{ padding: "1rem", border: "1px solid #3a3a3a", color: "#c0c0c0" }}>{item.item_name}</td>
                        <td style={{ padding: "1rem", textAlign: "right", border: "1px solid #3a3a3a", color: "#c0c0c0" }}>
                          {item.total_quantity}
                        </td>
                        <td style={{ padding: "1rem", textAlign: "right", border: "1px solid #3a3a3a", color: "#c0c0c0" }}>
                          {item.price || "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabPanel>

        {/* Notion Tab */}
        {project.notion_page_id && (
          <TabPanel active={activeTab === "notion"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ color: "#b19cd9" }}>Notion Workspace</h2>
              <a
                href={project.notion_page_id}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "0.75rem 1.25rem",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  color: "#e0e0e0",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
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
                Open in Notion →
              </a>
            </div>
            <iframe
              src={project.notion_page_id}
              style={{
                width: "100%",
                height: "800px",
                border: "1px solid #3a3a3a",
                borderRadius: "8px",
                backgroundColor: "#2a2a2a"
              }}
              title="Notion Page"
            />
          </TabPanel>
        )}

        {/* GitHub Tab */}
        {project.github_repo && (
          <TabPanel active={activeTab === "github"}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <h2 style={{ color: "#b19cd9" }}>GitHub Analytics</h2>
              <a
                href={`https://github.com/${project.github_repo}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "0.75rem 1.25rem",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  color: "#e0e0e0",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontSize: "0.9rem",
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
                Go to Repository →
              </a>
            </div>
            
            {githubLoading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
                Loading GitHub data...
              </div>
            ) : githubError ? (
              <div style={{ 
                padding: "1rem", 
                backgroundColor: "#3a2a2a", 
                border: "1px solid #f44336", 
                borderRadius: "6px",
                marginBottom: "1rem",
                color: "#ff6b6b"
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
            <h2 style={{ color: "#b19cd9", marginBottom: "1rem" }}>Documentation & Resources</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {project.doc_urls.map((doc, idx) => (
                <a
                  key={idx}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "1.5rem",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    textDecoration: "none",
                    color: "#e0e0e0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#2a2a2a",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#2d2d2d";
                    e.currentTarget.style.borderColor = "#5b1be3";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#2a2a2a";
                    e.currentTarget.style.borderColor = "#3a3a3a";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span style={{ fontSize: "1.1rem", fontWeight: "500" }}>{doc.name}</span>
                  <span style={{ color: "#8550e9" }}>Open →</span>
                </a>
              ))}
            </div>
          </TabPanel>
        )}

        {/* Settings Tab */}
        <TabPanel active={activeTab === "settings"}>
          <h2 style={{ color: "#b19cd9", marginBottom: "1.5rem" }}>Project Settings</h2>
          
          {editedProject && (
            <div style={{ maxWidth: "800px" }}>
              <FormField
                label="Project Name"
                value={editedProject.project_name}
                onChange={(value) => setEditedProject({ ...editedProject, project_name: value })}
              />

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#c0c0c0" }}>
                  Description
                </label>
                <textarea
                  value={editedProject.description || ""}
                  onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                  placeholder="Enter project description..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    fontFamily: "'Montserrat', sans-serif",
                    resize: "vertical",
                    backgroundColor: "#232323",
                    color: "#e0e0e0",
                    outline: "none"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
                  onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                />
              </div>

              <MemberSelector
                label="Managers"
                selectedIds={editedProject.managers || []}
                allMembers={allMembers}
                onChange={(ids) => setEditedProject({ ...editedProject, managers: ids })}
              />

              <MemberSelector
                label="Members"
                selectedIds={editedProject.members || []}
                allMembers={allMembers}
                onChange={(ids) => setEditedProject({ ...editedProject, members: ids })}
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
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#c0c0c0" }}>
                  Documentation Links
                </label>
                
                {editedProject.doc_urls && editedProject.doc_urls.length > 0 && (
                  <div style={{ marginBottom: "1rem" }}>
                    {editedProject.doc_urls.map((doc, idx) => (
                      <div key={idx} style={{ 
                        display: "flex", 
                        gap: "0.5rem", 
                        marginBottom: "0.5rem",
                        padding: "0.75rem",
                        border: "1px solid #3a3a3a",
                        borderRadius: "6px",
                        alignItems: "center",
                        backgroundColor: "#232323"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "500", color: "#e0e0e0" }}>{doc.name}</div>
                          <div style={{ fontSize: "0.9rem", color: "#888", wordBreak: "break-all" }}>
                            {doc.url}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveDoc(idx)}
                          style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#3a2a2a",
                            color: "#ff6b6b",
                            border: "1px solid #3a3a3a",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontFamily: "'Montserrat', sans-serif",
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
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ 
                  display: "flex", 
                  flexDirection: "column",
                  gap: "0.5rem" 
                }}>
                  <input
                    type="text"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Document name"
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      border: "1px solid #3a3a3a",
                      borderRadius: "6px",
                      backgroundColor: "#232323",
                      color: "#e0e0e0",
                      fontFamily: "'Montserrat', sans-serif",
                      outline: "none"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
                    onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                  />
                  <input
                    type="text"
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      border: "1px solid #3a3a3a",
                      borderRadius: "6px",
                      backgroundColor: "#232323",
                      color: "#e0e0e0",
                      fontFamily: "'Montserrat', sans-serif",
                      outline: "none"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
                    onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                  />
                  <button
                    onClick={handleAddDoc}
                    disabled={!newDocName || !newDocUrl}
                    style={{
                      width: "100%",
                      padding: "0.875rem 1.25rem",
                      backgroundColor: newDocName && newDocUrl ? "#5b1be3" : "#3a3a3a",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: newDocName && newDocUrl ? "pointer" : "not-allowed",
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: "600",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (newDocName && newDocUrl) {
                        e.currentTarget.style.backgroundColor = "#4a0fbf";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (newDocName && newDocUrl) {
                        e.currentTarget.style.backgroundColor = "#5b1be3";
                      }
                    }}
                  >
                    Add Document
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                style={{
                  padding: "1rem 2rem",
                  backgroundColor: saving ? "#3a3a3a" : "#5b1be3",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontFamily: "'Montserrat', sans-serif",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.backgroundColor = "#4a0fbf";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.currentTarget.style.backgroundColor = "#5b1be3";
                  }
                }}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          )}
        </TabPanel>
      </div>
    </main>
  );
}

// Helper Components
function TabButton({ 
  active, 
  onClick, 
  children,
  icon,
  isMobile
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  icon: React.ReactNode;
  isMobile: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: isMobile ? "0.75rem" : "1rem 2rem",
        border: "none",
        backgroundColor: "transparent",
        borderBottom: active ? "3px solid #5b1be3" : "3px solid transparent",
        cursor: "pointer",
        fontWeight: "normal",
        transition: "none",
        color: active ? "#8550e9" : "#888",
        fontFamily: "'Montserrat', sans-serif",
        whiteSpace: "nowrap",
        fontSize: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem"
      }}
    >
      {isMobile ? (
        <span style={{ color: active ? "#8550e9" : "#ffffff" }}>
          {icon}
        </span>
      ) : (
        children
      )}
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
      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#c0c0c0" }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "0.875rem",
          border: "1px solid #3a3a3a",
          borderRadius: "6px",
          fontSize: "1rem",
          backgroundColor: "#232323",
          color: "#e0e0e0",
          fontFamily: "'Montserrat', sans-serif",
          outline: "none"
        }}
        onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
        onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
      />
    </div>
  );
}

function MemberSelector({ 
  label, 
  selectedIds, 
  allMembers, 
  onChange 
}: { 
  label: string; 
  selectedIds: string[]; 
  allMembers: Member[]; 
  onChange: (ids: string[]) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedMembers = allMembers.filter(m => selectedIds.includes(m.member_id));
  const availableMembers = allMembers.filter(m => !selectedIds.includes(m.member_id));
  
  const filteredMembers = availableMembers.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.member_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.phone && m.phone.includes(searchTerm))
  );

  const handleAddMember = (memberId: string) => {
    onChange([...selectedIds, memberId]);
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleRemoveMember = (memberId: string) => {
    onChange(selectedIds.filter(id => id !== memberId));
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500", color: "#c0c0c0" }}>
        {label}
      </label>
      
      {/* Selected Members */}
      {selectedMembers.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          {selectedMembers.map(member => (
            <div
              key={member.member_id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                backgroundColor: "#2a2a4a",
                border: "1px solid #5b1be3",
                borderRadius: "6px",
                marginRight: "0.5rem",
                marginBottom: "0.5rem"
              }}
            >
              <span style={{ fontSize: "0.9rem", color: "#e0e0e0" }}>{member.name}</span>
              <button
                onClick={() => handleRemoveMember(member.member_id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8550e9",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  lineHeight: "1",
                  padding: "0 0.25rem",
                  fontFamily: "'Montserrat', sans-serif"
                }}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search/Add Input */}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            setShowDropdown(true);
          }}
          placeholder={`Search and add ${label.toLowerCase()}...`}
          style={{
            width: "100%",
            padding: "0.875rem",
            border: showDropdown ? "1px solid #5b1be3" : "1px solid #3a3a3a",
            borderRadius: "6px",
            fontSize: "1rem",
            backgroundColor: "#232323",
            color: "#e0e0e0",
            fontFamily: "'Montserrat', sans-serif",
            outline: "none"
          }}
        />

        {/* Dropdown */}
        {showDropdown && filteredMembers.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              maxHeight: "200px",
              overflowY: "auto",
              backgroundColor: "#232323",
              border: "1px solid #3a3a3a",
              borderTop: "none",
              borderRadius: "0 0 6px 6px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
              zIndex: 10
            }}
          >
            {filteredMembers.map(member => (
              <div
                key={member.member_id}
                onClick={() => handleAddMember(member.member_id)}
                style={{
                  padding: "0.75rem",
                  cursor: "pointer",
                  borderBottom: "1px solid #2a2a2a",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#2d2d2d";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div style={{ fontWeight: "500", color: "#e0e0e0" }}>{member.name}</div>
                <div style={{ fontSize: "0.85rem", color: "#888" }}>
                  {member.phone && `Phone: ${member.phone}`}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Click outside to close dropdown */}
        {showDropdown && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 5
            }}
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ title, primary, secondary }: { title: string; primary: string; secondary: string }) {
  return (
    <div style={{ 
      padding: "1.5rem", 
      border: "1px solid #3a3a3a", 
      borderRadius: "8px", 
      backgroundColor: "#2a2a2a"
    }}>
      <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "#888" }}>{title}</h3>
      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#8550e9" }}>{primary}</div>
      <div style={{ fontSize: "0.9rem", color: "#888" }}>{secondary}</div>
    </div>
  );
}

function ContributorsChart({ contributors }: { contributors: GitHubContributor[] }) {
  const maxContributions = Math.max(...contributors.map(c => c.contributions));
  
  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3 style={{ marginBottom: "1rem", color: "#b19cd9" }}>Top Contributors</h3>
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
                <div style={{ fontSize: "0.9rem", marginBottom: "0.25rem", color: "#c0c0c0" }}>{contributor.login}</div>
                <div style={{ 
                  height: "24px", 
                  backgroundColor: "#232323", 
                  borderRadius: "4px",
                  overflow: "hidden",
                  border: "1px solid #3a3a3a"
                }}>
                  <div style={{
                    height: "100%",
                    width: `${widthPercent}%`,
                    backgroundColor: "#5b1be3",
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
      <h3 style={{ marginBottom: "1rem", color: "#b19cd9" }}>Open Issues</h3>
      {issues.length === 0 ? (
        <p style={{ color: "#888", fontStyle: "italic" }}>No open issues found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {issues.map(issue => (
            <div
              key={issue.id}
              style={{
                border: "1px solid #3a3a3a",
                padding: "1rem",
                borderRadius: "6px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#2a2a2a"
              }}
            >
              <div style={{ flex: 1, marginRight: "1rem" }}>
                <a
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "1.1rem", fontWeight: "500", color: "#8550e9", textDecoration: "none" }}
                >
                  {issue.title}
                </a>
                {issue.assignees.length > 0 && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.9em", color: "#888" }}>
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
                  backgroundColor: "#5b1be3",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                  fontFamily: "'Montserrat', sans-serif",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#4a0fbf";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#5b1be3";
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