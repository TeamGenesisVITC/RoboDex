// app/issue-form.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "./lib/api";
import { useCart } from "./context/CartContext";
import { useRouter } from "next/navigation";

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
  const { addToCart } = useCart();
  const router = useRouter();

  useEffect(() => {
    // Fetch available projects
    api<Project[]>("projects").then(setProjects);
  }, []);

  async function handleIssueNow(e: React.FormEvent) {
    e.preventDefault();

    if (!projectId) {
      alert("Please select a project");
      return;
    }

    if (quantity <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }

    const payload = {
      project_id: projectId,
      items: [{ item_no: item_no, quantity: quantity }],
      return_date: returnDate || null,
    };

    try {
      await api("issue", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert("Item issued successfully!");
      onClose();
      location.reload();
    } catch (err) {
      alert("Failed to issue item: " + (err as Error).message);
    }
  }

  function handleAddToCart(e: React.FormEvent) {
    e.preventDefault();

    if (quantity <= 0) {
      alert("Quantity must be greater than 0");
      return;
    }

    addToCart(item_no, quantity);
    alert(`Added ${quantity}x Item #${item_no} to cart`);
    onClose();
  }

  return (
    <form className="modal">
      <h3>Issue Item #{item_no}</h3>

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

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <button
          type="button"
          onClick={handleIssueNow}
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            flex: 1,
          }}
        >
          Issue Now
        </button>
        <button
          type="button"
          onClick={handleAddToCart}
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            flex: 1,
          }}
        >
          Add to Cart
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: "0.5rem",
          padding: "0.75rem",
          backgroundColor: "#f44336",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        Cancel
      </button>
    </form>
  );
}