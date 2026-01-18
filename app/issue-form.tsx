// app/issue-form.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "./lib/api";

interface Project {
  project_id: string;
  project_name: string;
  description?: string;
}

interface Props {
  item_no: string;
  onClose: () => void;
}

export default function IssueForm({ item_no, onClose }: Props) {
  const [quantity, setQuantity] = useState<number>(1);
  const [returnDate, setReturnDate] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Fetch available projects
    api<Project[]>("projects").then(setProjects);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!projectId) {
      alert("Please select a project");
      return;
    }

    const payload = {
      project_id: projectId,
      items: [{ item_no: item_no, quantity: quantity }],
      return_date: returnDate || null,
    };
    
    console.log("Sending payload:", payload);
    
    await api("issue", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    onClose();
    location.reload();
  }

  return (
    <form onSubmit={submit} className="modal">
      <h3>Issue {item_no}</h3>

      <label>
        Project:
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          required
        >
          <option value="">Select a project</option>
          {projects.map(project => (
            <option key={project.project_id} value={project.project_id}>
              {project.project_name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Quantity:
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={e => setQuantity(Number(e.target.value))}
          required
        />
      </label>

      <label>
        Return Date (optional):
        <input
          type="date"
          value={returnDate}
          onChange={e => setReturnDate(e.target.value)}
        />
      </label>

      <button type="submit">Confirm</button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </form>
  );
}