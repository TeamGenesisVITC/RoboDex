"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { InventoryItem } from "../types";
import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";

interface ItemDetailsExtended {
  item_no: string;
  name: string;
  quantity: number;
  available: number;
  price?: string | number | null;
  location?: string | null;
  resources?: string | null;
}

interface Project {
  project_id: string;
  project_name: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ItemDetailsExtended | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [projectId, setProjectId] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingItem, setLoadingItem] = useState(false);
  const { addToCart, getTotalItems } = useCart();
  const router = useRouter();

  useEffect(() => {
    api<InventoryItem[]>("registry").then(setItems);
    api<Project[]>("projects").then(setProjects);
  }, []);

  // Fuzzy search function
  const fuzzyMatch = (str: string, query: string): number => {
    if (!query) return 1;
    
    str = str.toLowerCase();
    query = query.toLowerCase();
    
    if (str.includes(query)) return 1;
    
    let score = 0;
    let queryIndex = 0;
    let lastMatchIndex = -1;
    
    for (let i = 0; i < str.length && queryIndex < query.length; i++) {
      if (str[i] === query[queryIndex]) {
        score += 1;
        if (lastMatchIndex === i - 1) {
          score += 0.5;
        }
        lastMatchIndex = i;
        queryIndex++;
      }
    }
    
    if (queryIndex === query.length) {
      return score / (query.length * 1.5);
    }
    
    return 0;
  };

  const filteredItems = items
    .map(item => {
      const query = searchQuery.toLowerCase();
      const name = item.name?.toLowerCase() || "";
      const location = item.location?.toLowerCase() || "";
      
      const nameScore = fuzzyMatch(name, query);
      const locationScore = fuzzyMatch(location, query);
      const maxScore = Math.max(nameScore, locationScore);
      
      return {
        ...item,
        searchScore: maxScore
      };
    })
    .filter(item => item.searchScore > 0.3)
    .sort((a, b) => b.searchScore - a.searchScore);

  const openItemModal = async (item: InventoryItem) => {
    setLoadingItem(true);
    try {
      const data = await api<ItemDetailsExtended[]>(`registry?item_no=eq.${item.item_no}`);
      
      if (data && data.length > 0) {
        // Find the exact matching item by item_no
        const matchedItem = data.find(i => i.item_no === item.item_no) || data[0];
        
        console.log('Clicked item:', item.item_no, item.name);
        console.log('Fetched data:', data);
        console.log('Selected item:', matchedItem);
        
        setSelectedItem(matchedItem);
        setQuantity(1);
      } else {
        // Fallback: use the item data we already have
        console.warn('No data returned from API, using clicked item data');
        setSelectedItem({
          item_no: item.item_no,
          name: item.name,
          quantity: item.quantity,
          available: item.available,
          price: item.price,
          location: item.location,
          resources: item.resources
        });
        setQuantity(1);
      }
    } catch (err) {
      console.error("Failed to load item details:", err);
      // Fallback: use the item data from the grid
      setSelectedItem({
        item_no: item.item_no,
        name: item.name,
        quantity: item.quantity,
        available: item.available,
        price: item.price,
        location: item.location,
        resources: item.resources
      });
      setQuantity(1);
    } finally {
      setLoadingItem(false);
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setQuantity(1);
    setProjectId("");
    setReturnDate("");
  };

  const handleIssue = async () => {
    if (!projectId) {
      alert("Please select a project");
      return;
    }

    const payload = {
      project_id: projectId,
      items: [{ item_no: selectedItem!.item_no, quantity }],
      return_date: returnDate || null,
    };

    try {
      await api("issue", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert("Item issued successfully!");
      closeModal();
      // Refresh inventory
      const updatedItems = await api<InventoryItem[]>("registry");
      setItems(updatedItems);
    } catch (err) {
      alert("Failed to issue item: " + (err as Error).message);
    }
  };

  const handleAddToCart = () => {
    addToCart(selectedItem!.item_no, quantity);
    alert(`Added ${quantity} x ${selectedItem!.name} to cart!`);
    closeModal();
  };

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
        {/* Header with Cart Icon */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem"
        }}>
          <h1 style={{
            color: "#8550e9",
            fontSize: "2.5rem",
            fontWeight: "600",
            letterSpacing: "0.5px",
            margin: 0
          }}>
            Inventory
          </h1>
          
          <button
            onClick={() => router.push("/cart")}
            style={{
              position: "relative",
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: "6px",
              padding: "0.75rem 1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: "600",
              fontFamily: "'Montserrat', sans-serif",
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
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Cart
            {getTotalItems() > 0 && (
              <span style={{
                position: "absolute",
                top: "-8px",
                right: "-8px",
                backgroundColor: "#7743e9",
                color: "white",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: "700"
              }}>
                {getTotalItems()}
              </span>
            )}
          </button>
        </div>

        {/* Search Box */}
        <div style={{ marginBottom: "2rem" }}>
          <input
            type="text"
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "0.875rem 1.25rem",
              fontSize: "1rem",
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: "8px",
              color: "#e0e0e0",
              outline: "none",
              transition: "all 0.3s ease",
              fontFamily: "'Montserrat', sans-serif"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#5b1be3";
              e.target.style.backgroundColor = "#2d2d2d";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#3a3a3a";
              e.target.style.backgroundColor = "#2a2a2a";
            }}
          />
        </div>

        {/* Inventory Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "1.5rem"
        }}>
          {filteredItems.map(item => {
            const disabled = item.available === 0;

            return (
              <div
                key={item.item_no}
                onClick={() => !disabled && openItemModal(item)}
                style={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "6px",
                  padding: "1.5rem",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.5 : 1,
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.borderColor = "#5b1be3";
                    e.currentTarget.style.backgroundColor = "#2d2d2d";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(139, 122, 184, 0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.borderColor = "#3a3a3a";
                    e.currentTarget.style.backgroundColor = "#2a2a2a";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                <h3 style={{
                  color: "#ffffff",
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  lineHeight: "1.4"
                }}>
                  {item.name}
                </h3>

                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{
                      color: "#888",
                      fontSize: "0.875rem",
                      fontWeight: "500"
                    }}>
                      Total Quantity
                    </span>
                    <span style={{
                      color: "#c0c0c0",
                      fontSize: "0.875rem",
                      fontWeight: "600"
                    }}>
                      {item.quantity}
                    </span>
                  </div>

                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{
                      color: "#888",
                      fontSize: "0.875rem",
                      fontWeight: "500"
                    }}>
                      Available
                    </span>
                    <span style={{
                      color: item.available === 0 ? "#c97a7a" : "#7ab87a",
                      fontSize: "0.875rem",
                      fontWeight: "700"
                    }}>
                      {item.available}
                    </span>
                  </div>

                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid #3a3a3a"
                  }}>
                    <span style={{
                      color: "#888",
                      fontSize: "0.875rem",
                      fontWeight: "500"
                    }}>
                      Location
                    </span>
                    <span style={{
                      color: "#c0c0c0",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      textAlign: "right",
                      maxWidth: "150px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {item.location && item.location !== "NULL" ? item.location : "—"}
                    </span>
                  </div>
                </div>

                {disabled && (
                  <div style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    backgroundColor: "#4a3a3a",
                    color: "#c97a7a",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "3px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    letterSpacing: "0.5px"
                  }}>
                    OUT OF STOCK
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "3rem",
            color: "#888"
          }}>
            <p style={{ fontSize: "1.125rem" }}>
              {searchQuery ? "No items match your search" : "No items in inventory"}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedItem && !loadingItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "1rem"
          }}
          onClick={closeModal}
        >
          <div
            style={{
              backgroundColor: "rgba(42, 42, 42, 0.95)",
              border: "1px solid #3a3a3a",
              borderRadius: "6px",
              padding: "2rem",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              fontFamily: "'Montserrat', sans-serif"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              color: "#b19cd9",
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "1.5rem"
            }}>
              {selectedItem.name}
            </h2>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginBottom: "1.5rem"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.75rem",
                backgroundColor: "#232323",
                borderRadius: "4px"
              }}>
                <span style={{ color: "#888", fontSize: "0.9rem" }}>Item No</span>
                <span style={{ color: "#c0c0c0", fontWeight: "600" }}>{selectedItem.item_no}</span>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.75rem",
                backgroundColor: "#232323",
                borderRadius: "4px"
              }}>
                <span style={{ color: "#888", fontSize: "0.9rem" }}>Total Quantity</span>
                <span style={{ color: "#c0c0c0", fontWeight: "600" }}>{selectedItem.quantity}</span>
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.75rem",
                backgroundColor: "#232323",
                borderRadius: "4px"
              }}>
                <span style={{ color: "#888", fontSize: "0.9rem" }}>Available</span>
                <span style={{
                  color: selectedItem.available === 0 ? "#c97a7a" : "#7ab87a",
                  fontWeight: "700"
                }}>
                  {selectedItem.available}
                </span>
              </div>

              {selectedItem.price && (
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "0.75rem",
                  backgroundColor: "#232323",
                  borderRadius: "4px"
                }}>
                  <span style={{ color: "#888", fontSize: "0.9rem" }}>Price</span>
                  <span style={{ color: "#c0c0c0", fontWeight: "600" }}>{selectedItem.price}</span>
                </div>
              )}

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.75rem",
                backgroundColor: "#232323",
                borderRadius: "4px"
              }}>
                <span style={{ color: "#888", fontSize: "0.9rem" }}>Location</span>
                <span style={{ color: "#c0c0c0", fontWeight: "600" }}>
                  {selectedItem.location && selectedItem.location !== "NULL" ? selectedItem.location : "—"}
                </span>
              </div>
            </div>

            {/* Issue Form */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginBottom: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid #3a3a3a"
            }}>
              <label style={{ color: "#c0c0c0" }}>
                <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "#888" }}>Quantity</div>
                <input
                  type="number"
                  min={1}
                  max={selectedItem.available}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
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
                  onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
                  onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                />
              </label>

              <label style={{ color: "#c0c0c0" }}>
                <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "#888" }}>Project</div>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
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
                  onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
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
                <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem", color: "#888" }}>Return Date (Optional)</div>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
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
                  onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
                  onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                />
              </label>
            </div>

            {/* Buttons */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem"
            }}>
              <button
                onClick={handleIssue}
                disabled={selectedItem.available === 0}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  backgroundColor: selectedItem.available === 0 ? "#3a3a3a" : "#6b9b6b",
                  color: selectedItem.available === 0 ? "#666" : "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: selectedItem.available === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  fontFamily: "'Montserrat', sans-serif"
                }}
                onMouseEnter={(e) => {
                  if (selectedItem.available > 0) {
                    e.currentTarget.style.backgroundColor = "#5d8a5d";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedItem.available > 0) {
                    e.currentTarget.style.backgroundColor = "#6b9b6b";
                  }
                }}
              >
                {selectedItem.available === 0 ? "Out of Stock" : "Issue Item"}
              </button>

              <button
                onClick={handleAddToCart}
                disabled={selectedItem.available === 0}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  backgroundColor: selectedItem.available === 0 ? "#3a3a3a" : "#5b1be3",
                  color: selectedItem.available === 0 ? "#666" : "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: selectedItem.available === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  fontFamily: "'Montserrat', sans-serif"
                }}
                onMouseEnter={(e) => {
                  if (selectedItem.available > 0) {
                    e.currentTarget.style.backgroundColor = "#4a0fbf";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedItem.available > 0) {
                    e.currentTarget.style.backgroundColor = "#5b1be3";
                  }
                }}
              >
                Add to Cart
              </button>

              <button
                onClick={closeModal}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  backgroundColor: "transparent",
                  color: "#888",
                  border: "1px solid #3a3a3a",
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  fontFamily: "'Montserrat', sans-serif"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#5a1be3";
                  e.currentTarget.style.color = "#6a30e7";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#3a3a3a";
                  e.currentTarget.style.color = "#888";
                }}
              >
                Cancel
              </button>
            </div>

            {/* Resources Link */}
            {selectedItem.resources && selectedItem.resources !== "NULL" && (
              <div style={{
                marginTop: "1.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid #3a3a3a",
                textAlign: "center"
              }}>
                <a
                  href={selectedItem.resources}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#5b1be3",
                    fontSize: "0.9rem",
                    textDecoration: "none",
                    borderBottom: "1px dotted #5b1be3",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontFamily: "'Montserrat', sans-serif"
                  }}
                >
                  Resources
                  <span style={{ fontSize: "1.1rem" }}>↗</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {loadingItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
        >
          <div style={{ color: "#fff", fontSize: "1.2rem" }}>Loading item details...</div>
        </div>
      )}
    </main>
  );
}