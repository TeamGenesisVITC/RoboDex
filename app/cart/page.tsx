"use client";

import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { api } from "../lib/api";
import { useRouter } from "next/navigation";

interface Project {
  project_id: string;
  project_name: string;
}

interface ItemDetails {
  item_no: string;
  name: string;
  available: number;
}

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart, getTotalItems } = useCart();
  const [projectId, setProjectId] = useState<string>("");
  const [returnDate, setReturnDate] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [itemDetails, setItemDetails] = useState<{ [key: string]: ItemDetails }>({});
  const router = useRouter();

  useEffect(() => {
    api<Project[]>("projects").then(setProjects);
  }, []);

  useEffect(() => {
    async function fetchItemDetails() {
      for (const item of items) {
        if (!itemDetails[item.item_no]) {
          try {
            const data = await api<ItemDetails[]>(`registry?item_no=eq.${item.item_no}`);
            if (data && data.length > 0) {
              setItemDetails(prev => ({
                ...prev,
                [item.item_no]: data[0],
              }));
            }
          } catch (err) {
            console.error(`Failed to load details for item ${item.item_no}:`, err);
          }
        }
      }
    }

    if (items.length > 0) {
      fetchItemDetails();
    }
  }, [items, itemDetails]);

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
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#1a1a1a",
      padding: "2rem",
      fontFamily: "'Montserrat', sans-serif"
    }}>
      <div style={{
        maxWidth: "900px",
        margin: "0 auto"
      }}>
        <h1 style={{
          color: "#733fd3",
          fontSize: "2.5rem",
          fontWeight: "600",
          marginBottom: "2rem",
          letterSpacing: "0.5px"
        }}>
          Cart ({getTotalItems()} items)
        </h1>

        {items.length === 0 ? (
          <div style={{
            backgroundColor: "#2a2a2a",
            border: "1px solid #3a3a3a",
            borderRadius: "6px",
            padding: "3rem",
            textAlign: "center"
          }}>
            <p style={{
              color: "#888",
              fontSize: "1.125rem",
              marginBottom: "1.5rem"
            }}>
              Your cart is empty.
            </p>
            <button
              onClick={() => router.push("/inventory")}
              style={{
                padding: "0.875rem 1.5rem",
                backgroundColor: "#ffffff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                fontFamily: "'Montserrat', sans-serif",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#5c3daf"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#8b7ab8"}
            >
              Browse Inventory
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{
                color: "#703fcc",
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "1rem"
              }}>
                Items in Cart
              </h3>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}>
                {items.map(item => {
                  const details = itemDetails[item.item_no];
                  return (
                    <div
                      key={item.item_no}
                      style={{
                        backgroundColor: "#2a2a2a",
                        border: "1px solid #3a3a3a",
                        borderRadius: "6px",
                        padding: "1.25rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "1rem",
                        flexWrap: "wrap"
                      }}
                    >
                      <div style={{ flex: "1 1 200px" }}>
                        <strong style={{
                          color: "#ffffff",
                          fontSize: "1.125rem",
                          display: "block",
                          marginBottom: "0.25rem"
                        }}>
                          {details?.name || `Item #${item.item_no}`}
                        </strong>
                        <div style={{
                          fontSize: "0.875rem",
                          color: "#888"
                        }}>
                          Item No: {item.item_no}
                        </div>
                      </div>
                      <div style={{
                        display: "flex",
                        gap: "1rem",
                        alignItems: "center",
                        flexWrap: "wrap"
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <label style={{
                            color: "#888",
                            fontSize: "0.75rem",
                            fontWeight: "500"
                          }}>
                            Quantity
                          </label>
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
                              width: "100px",
                              padding: "0.75rem",
                              fontSize: "1rem",
                              backgroundColor: "#232323",
                              border: "1px solid #3a3a3a",
                              borderRadius: "4px",
                              color: "#e0e0e0",
                              outline: "none",
                              fontFamily: "'Montserrat', sans-serif"
                            }}
                            onFocus={(e) => e.target.style.borderColor = "#5734b9"}
                            onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                          />
                        </div>
                        <button
                          onClick={() => removeFromCart(item.item_no)}
                          style={{
                            padding: "0.75rem 1.25rem",
                            backgroundColor: "#b05a5a",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            fontFamily: "'Montserrat', sans-serif",
                            transition: "all 0.3s ease",
                            alignSelf: "flex-end"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#b86b6b"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#c97a7a"}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Issue Details Form */}
            <div
              style={{
                backgroundColor: "#2a2a2a",
                border: "1px solid #3a3a3a",
                borderRadius: "6px",
                padding: "1.5rem"
              }}
            >
              <h3 style={{
                color: "#7944da",
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "1.5rem"
              }}>
                Issue Details
              </h3>

              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginBottom: "1.5rem"
              }}>
                <label style={{ color: "#c0c0c0" }}>
                  <div style={{
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    color: "#888"
                  }}>
                    Project
                  </div>
                  <select
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      fontSize: "1rem",
                      backgroundColor: "#232323",
                      border: "1px solid #3a3a3a",
                      borderRadius: "4px",
                      color: "#e0e0e0",
                      outline: "none",
                      fontFamily: "'Montserrat', sans-serif",
                      cursor: "pointer"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#552fbe"}
                    onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                  >
                    <option value="">Select a project</option>
                    {projects.map(project => (
                      <option key={project.project_id} value={project.project_id}>
                        {project.project_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ color: "#c0c0c0" }}>
                  <div style={{
                    marginBottom: "0.5rem",
                    fontSize: "0.9rem",
                    color: "#888"
                  }}>
                    Return Date (Optional)
                  </div>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={e => setReturnDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.875rem",
                      fontSize: "1rem",
                      backgroundColor: "#232323",
                      border: "1px solid #3a3a3a",
                      borderRadius: "4px",
                      color: "#e0e0e0",
                      outline: "none",
                      fontFamily: "'Montserrat', sans-serif"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#5631ba"}
                    onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                  />
                </label>
              </div>

              <div style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap"
              }}>
                <button
                  onClick={handleIssueAll}
                  style={{
                    flex: "1 1 200px",
                    padding: "0.875rem",
                    backgroundColor: "#477947",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: "'Montserrat', sans-serif",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#5d8a5d"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#6b9b6b"}
                >
                  Issue All Items
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    flex: "1 1 200px",
                    padding: "0.875rem",
                    backgroundColor: "#b05a5a",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: "'Montserrat', sans-serif",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#b86b6b"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#c97a7a"}
                >
                  Cancel & Clear Cart
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}