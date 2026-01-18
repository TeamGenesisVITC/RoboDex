// app/cart/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { api } from "../lib/api";
import { useRouter } from "next/navigation";

interface Project {
  project_id: string;
  project_name: string;
}

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart, getTotalItems } = useCart();
  const [projectId, setProjectId] = useState<string>("");
  const [returnDate, setReturnDate] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  useEffect(() => {
    api<Project[]>("projects").then(setProjects);
  }, []);

  async function handleIssueAll() {
    if (!projectId) {
      alert("Please select a project");
      return;
    }

    if (items.length === 0) {
      alert("Cart is empty");
      return;
    }

    const payload = {
      project_id: projectId,
      items: items.map(item => ({
        item_no: item.item_no,
        quantity: item.quantity,
      })),
      return_date: returnDate || null,
    };

    try {
      await api("issue", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert("Items issued successfully!");
      clearCart();
      router.push("/inventory");
    } catch (err) {
      alert("Failed to issue items: " + (err as Error).message);
    }
  }

  function handleCancel() {
    if (confirm("Clear all items from cart?")) {
      clearCart();
      router.push("/inventory");
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Cart ({getTotalItems()} items)</h1>

      {items.length === 0 ? (
        <div>
          <p>Your cart is empty.</p>
          <button
            onClick={() => router.push("/inventory")}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "1rem",
            }}
          >
            Browse Inventory
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "2rem" }}>
            <h3>Items in Cart</h3>
            {items.map(item => (
              <div
                key={item.item_no}
                style={{
                  border: "1px solid #ccc",
                  padding: "1rem",
                  borderRadius: "4px",
                  marginBottom: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong>Item #{item.item_no}</strong>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => {
                      const newQty = Number(e.target.value);
                      if (newQty > 0) {
                        updateQuantity(item.item_no, newQty);
                      }
                    }}
                    style={{
                      width: "80px",
                      padding: "0.5rem",
                    }}
                  />
                  <button
                    onClick={() => removeFromCart(item.item_no)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              border: "2px solid #4CAF50",
              padding: "1.5rem",
              borderRadius: "8px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <h3>Issue Details</h3>

            <label style={{ display: "block", marginBottom: "1rem" }}>
              Project:
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                }}
              >
                <option value="">Select a project</option>
                {projects.map(project => (
                  <option key={project.project_id} value={project.project_id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "block", marginBottom: "1rem" }}>
              Return Date (optional):
              <input
                type="date"
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                }}
              />
            </label>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleIssueAll}
                style={{
                  flex: 1,
                  padding: "1rem",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                Issue All Items
              </button>
              <button
                onClick={handleCancel}
                style={{
                  flex: 1,
                  padding: "1rem",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                Cancel & Clear Cart
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}