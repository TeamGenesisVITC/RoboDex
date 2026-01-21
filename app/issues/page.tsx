// app/issues/page.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";

interface IssueItemRaw {
  id: string;
  issue_id: string;
  item_no: string;
  quantity: number;
  member_id: string;
  project_id: string;
  issued_date: string;
  return_date: string | null;
  returned: boolean;
  returned_quantity: number;
}

interface ItemDetails {
  item_no: string;
  name: string;
}

interface GroupedIssue {
  issue_id: string;
  project_id: string;
  issued_date: string;
  return_date: string | null;
  returned: boolean;
  items: {
    item_no: string;
    quantity: number;
    returned_quantity: number;
    name?: string;
  }[];
}

export default function IssuesPage() {
  const [issues, setIssues] = useState<GroupedIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<GroupedIssue | null>(null);
  const [showPartialReturn, setShowPartialReturn] = useState(false);
  const [partialReturns, setPartialReturns] = useState<{ [key: string]: number }>({});
  const [itemNames, setItemNames] = useState<{ [key: string]: string }>({});
  const { addToCart } = useCart();
  const router = useRouter();

  function groupIssues(raw: IssueItemRaw[]): GroupedIssue[] {
    const map = new Map<string, GroupedIssue>();

    raw.forEach(item => {
      if (!map.has(item.issue_id)) {
        map.set(item.issue_id, {
          issue_id: item.issue_id,
          project_id: item.project_id,
          issued_date: item.issued_date,
          return_date: item.return_date,
          returned: item.returned,
          items: [],
        });
      }

      const issue = map.get(item.issue_id)!;
      issue.items.push({
        item_no: item.item_no,
        quantity: item.quantity,
        returned_quantity: item.returned_quantity,
      });
    });

    return Array.from(map.values());
  }

  useEffect(() => {
    async function fetchIssues() {
      try {
        const data = await api<IssueItemRaw[]>("my-issues");
        console.log("Raw issues data:", data);
        
        const grouped = groupIssues(data);
        console.log("Grouped issues:", grouped);
        
        // Sort: active issues first, then inactive, both in ascending order of issue date
        const sorted = grouped.sort((a, b) => {
          if (a.returned !== b.returned) {
            return a.returned ? 1 : -1; // Active (not returned) first
          }
          return new Date(a.issued_date).getTime() - new Date(b.issued_date).getTime();
        });
        
        setIssues(sorted);

        const uniqueItemNos = new Set<string>();
        data.forEach(item => uniqueItemNos.add(item.item_no));
        
        for (const item_no of uniqueItemNos) {
          try {
            const itemData = await api<ItemDetails[]>(`registry?item_no=eq.${item_no}`);
            if (itemData && itemData.length > 0) {
              setItemNames(prev => ({
                ...prev,
                [item_no]: itemData[0].name,
              }));
            }
          } catch (err) {
            console.error(`Failed to fetch name for item ${item_no}:`, err);
          }
        }
      } catch (err) {
        console.error("Failed to load issues:", err);
        setIssues([]);
      }
    }
    
    fetchIssues();
  }, []);

  async function loadIssues() {
    try {
      const data = await api<IssueItemRaw[]>("my-issues");
      const grouped = groupIssues(data);
      
      // Sort: active issues first, then inactive, both in ascending order of issue date
      const sorted = grouped.sort((a, b) => {
        if (a.returned !== b.returned) {
          return a.returned ? 1 : -1; // Active (not returned) first
        }
        return new Date(a.issued_date).getTime() - new Date(b.issued_date).getTime();
      });
      
      setIssues(sorted);
    } catch (err) {
      console.error("Failed to load issues:", err);
      setIssues([]);
    }
  }

  async function handleFullReturn(issue_id: string) {
    if (!confirm("Return this entire issue?")) return;

    try {
      await api("full", {
        method: "POST",
        body: JSON.stringify({ issue_id }),
      });
      
      alert("Issue returned successfully!");
      loadIssues();
    } catch (err) {
      alert("Failed to return issue: " + (err as Error).message);
    }
  }

  async function handlePartialReturn(issue_id: string) {
    const items = Object.entries(partialReturns)
      .filter(([_, qty]) => qty > 0)
      .map(([item_no, quantity]) => ({ item_no, quantity }));

    if (items.length === 0) {
      alert("Please specify quantities to return");
      return;
    }

    try {
      await api("partial", {
        method: "POST",
        body: JSON.stringify({ issue_id, items }),
      });

      alert("Partial return successful!");
      setShowPartialReturn(false);
      setPartialReturns({});
      setSelectedIssue(null);
      loadIssues();
    } catch (err) {
      alert("Failed to process partial return: " + (err as Error).message);
    }
  }

  function openPartialReturn(issue: GroupedIssue) {
    setSelectedIssue(issue);
    setShowPartialReturn(true);
    const initial: { [key: string]: number } = {};
    issue.items.forEach(item => {
      initial[item.item_no] = 0;
    });
    setPartialReturns(initial);
  }

  function handleReissue(issue: GroupedIssue) {
    issue.items.forEach(item => {
      addToCart(item.item_no, item.quantity);
    });

    alert(`Added ${issue.items.length} item(s) to cart!`);
    router.push("/cart");
  }

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#1a1a1a",
      padding: "2rem",
      fontFamily: "'Montserrat', sans-serif"
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        <h1 style={{
          color: "#7944da",
          fontSize: "2.5rem",
          fontWeight: "600",
          marginBottom: "2rem",
          letterSpacing: "0.5px"
        }}>
          My Issues
        </h1>

        {issues.length === 0 ? (
          <div style={{
            backgroundColor: "#2a2a2a",
            border: "1px solid #3a3a3a",
            borderRadius: "6px",
            padding: "3rem",
            textAlign: "center"
          }}>
            <p style={{
              color: "#888",
              fontSize: "1.125rem"
            }}>
              No issues found.
            </p>
          </div>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            {issues.map(issue => (
              <div
                key={issue.issue_id}
                style={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "6px",
                  padding: "1.5rem",
                  opacity: issue.returned ? 0.6 : 1,
                  transition: "all 0.3s ease"
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  flexWrap: "wrap",
                  gap: "1.5rem"
                }}>
                  <div style={{ flex: "1 1 300px" }}>
                    <h3 style={{
                      color: "#7944da",
                      fontSize: "1.25rem",
                      fontWeight: "600",
                      marginBottom: "1rem"
                    }}>
                      Issue #{issue.issue_id.substring(0, 8)}...
                    </h3>
                    
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      marginBottom: "1rem"
                    }}>
                      <div style={{
                        display: "flex",
                        gap: "0.5rem"
                      }}>
                        <span style={{
                          color: "#888",
                          fontSize: "0.9rem"
                        }}>Issue Date:</span>
                        <span style={{
                          color: "#c0c0c0",
                          fontSize: "0.9rem",
                          fontWeight: "600"
                        }}>
                          {new Date(issue.issued_date).toLocaleDateString()}
                        </span>
                      </div>

                      {issue.return_date && (
                        <div style={{
                          display: "flex",
                          gap: "0.5rem"
                        }}>
                          <span style={{
                            color: "#888",
                            fontSize: "0.9rem"
                          }}>Expected Return:</span>
                          <span style={{
                            color: "#c0c0c0",
                            fontSize: "0.9rem",
                            fontWeight: "600"
                          }}>
                            {new Date(issue.return_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div style={{
                        display: "flex",
                        gap: "0.5rem"
                      }}>
                        <span style={{
                          color: "#888",
                          fontSize: "0.9rem"
                        }}>Status:</span>
                        <span style={{
                          color: issue.returned ? "#c97a7a" : "#7ab87a",
                          fontSize: "0.9rem",
                          fontWeight: "700"
                        }}>
                          {issue.returned ? "Returned" : "Active"}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: "#232323",
                      padding: "1rem",
                      borderRadius: "4px",
                      border: "1px solid #3a3a3a"
                    }}>
                      <strong style={{
                        color: "#7944da",
                        fontSize: "0.95rem",
                        display: "block",
                        marginBottom: "0.75rem"
                      }}>Items:</strong>
                      <ul style={{
                        listStyle: "none",
                        padding: 0,
                        margin: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem"
                      }}>
                        {issue.items.map((item, idx) => (
                          <li key={idx} style={{
                            color: "#c0c0c0",
                            fontSize: "0.9rem",
                            paddingLeft: "1rem",
                            position: "relative"
                          }}>
                            <span style={{
                              position: "absolute",
                              left: 0,
                              color: "#7944da"
                            }}>•</span>
                            <span style={{ color: "#e0e0e0" }}>
                              {itemNames[item.item_no] || `Item #${item.item_no}`}
                            </span>
                            {" - "}
                            <span style={{ color: "#888" }}>Qty:</span> {item.quantity}
                            {item.returned_quantity > 0 && (
                              <span style={{
                                color: "#c97a7a",
                                marginLeft: "0.5rem"
                              }}>
                                (Returned: {item.returned_quantity})
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexDirection: "column",
                    minWidth: "150px"
                  }}>
                    {!issue.returned ? (
                      <>
                        <button
                          onClick={() => handleFullReturn(issue.issue_id)}
                          style={{
                            padding: "0.75rem 1.25rem",
                            cursor: "pointer",
                            backgroundColor: "#6b9b6b",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            fontFamily: "'Montserrat', sans-serif",
                            transition: "all 0.3s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#5d8a5d"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#6b9b6b"}
                        >
                          Full Return
                        </button>
                        <button
                          onClick={() => openPartialReturn(issue)}
                          style={{
                            padding: "0.75rem 1.25rem",
                            cursor: "pointer",
                            backgroundColor: "#7944da",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                            fontFamily: "'Montserrat', sans-serif",
                            transition: "all 0.3s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#6a3bc9"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#7944da"}
                        >
                          Partial Return
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleReissue(issue)}
                        style={{
                          padding: "0.75rem 1.25rem",
                          cursor: "pointer",
                          backgroundColor: "#da871a",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "0.9rem",
                          fontWeight: "600",
                          fontFamily: "'Montserrat', sans-serif",
                          transition: "all 0.3s ease"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#cd8125"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#dd8d24"}
                      >
                        Reissue
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Partial Return Modal */}
        {showPartialReturn && selectedIssue && (
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
            onClick={() => setShowPartialReturn(false)}
          >
            <div
              style={{
                backgroundColor: "rgba(42, 42, 42, 0.95)",
                border: "1px solid #3a3a3a",
                borderRadius: "6px",
                padding: "2rem",
                maxWidth: "550px",
                width: "100%",
                maxHeight: "90vh",
                overflowY: "auto",
                fontFamily: "'Montserrat', sans-serif",
                position: "relative"
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPartialReturn(false)}
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  background: "none",
                  border: "none",
                  color: "#888",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: "0.25rem",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#3a3a3a";
                  e.currentTarget.style.color = "#7944da";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#888";
                }}
              >
                ×
              </button>

              <h2 style={{
                color: "#7944da",
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "0.5rem"
              }}>
                Partial Return
              </h2>
              <p style={{
                color: "#888",
                fontSize: "0.9rem",
                marginBottom: "1.5rem"
              }}>
                Specify quantities to return for each item:
              </p>

              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                marginBottom: "1.5rem"
              }}>
                {selectedIssue.items.map(item => {
                  const available = item.quantity - item.returned_quantity;
                  const itemName = itemNames[item.item_no] || `Item #${item.item_no}`;
                  return (
                    <div key={item.item_no} style={{
                      backgroundColor: "#232323",
                      padding: "1rem",
                      borderRadius: "4px",
                      border: "1px solid #3a3a3a"
                    }}>
                      <label style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem"
                      }}>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "0.5rem"
                        }}>
                          <span style={{
                            color: "#e0e0e0",
                            fontSize: "0.95rem",
                            fontWeight: "600"
                          }}>
                            {itemName}
                          </span>
                          <span style={{
                            color: "#888",
                            fontSize: "0.85rem"
                          }}>
                            Available: {available}
                          </span>
                        </div>
                        <input
                          type="number"
                          min={0}
                          max={available}
                          value={partialReturns[item.item_no] || 0}
                          onChange={e =>
                            setPartialReturns({
                              ...partialReturns,
                              [item.item_no]: Number(e.target.value),
                            })
                          }
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            fontSize: "1rem",
                            backgroundColor: "#1a1a1a",
                            border: "1px solid #3a3a3a",
                            borderRadius: "4px",
                            color: "#e0e0e0",
                            outline: "none",
                            fontFamily: "'Montserrat', sans-serif"
                          }}
                          onFocus={(e) => e.target.style.borderColor = "#7944da"}
                          onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}>
                <button
                  onClick={() => handlePartialReturn(selectedIssue.issue_id)}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    cursor: "pointer",
                    backgroundColor: "#6b9b6b",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: "'Montserrat', sans-serif",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#5d8a5d"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#6b9b6b"}
                >
                  Confirm Return
                </button>
                <button
                  onClick={() => {
                    setShowPartialReturn(false);
                    setSelectedIssue(null);
                    setPartialReturns({});
                  }}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    color: "#c97a7a",
                    border: "1px solid #c97a7a",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    fontFamily: "'Montserrat', sans-serif",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#c97a7a";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#c97a7a";
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}