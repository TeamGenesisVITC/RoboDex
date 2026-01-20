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
        
        // Group by issue_id
        const grouped = groupIssues(data);
        console.log("Grouped issues:", grouped);
        setIssues(grouped);

        // Fetch item names for all unique items
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
      setIssues(grouped);
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
    // Add all items from this issue to cart
    issue.items.forEach(item => {
      addToCart(item.item_no, item.quantity);
    });

    alert(`Added ${issue.items.length} item(s) to cart!`);
    router.push("/cart");
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>My Issues</h1>

      {issues.length === 0 ? (
        <p>No issues found.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {issues.map(issue => (
            <div
              key={issue.issue_id}
              style={{
                border: "1px solid #ccc",
                padding: "1rem",
                borderRadius: "8px",
                opacity: issue.returned ? 0.5 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h3>Issue #{issue.issue_id.substring(0, 8)}...</h3>
                  <p>
                    <strong>Issue Date:</strong>{" "}
                    {new Date(issue.issued_date).toLocaleDateString()}
                  </p>
                  {issue.return_date && (
                    <p>
                      <strong>Expected Return:</strong>{" "}
                      {new Date(issue.return_date).toLocaleDateString()}
                    </p>
                  )}
                  <p>
                    <strong>Status:</strong> {issue.returned ? "Returned" : "Active"}
                  </p>

                  <div style={{ marginTop: "1rem" }}>
                    <strong>Items:</strong>
                    <ul>
                      {issue.items.map((item, idx) => (
                        <li key={idx}>
                          {itemNames[item.item_no] || `Item #${item.item_no}`} - Quantity: {item.quantity}
                          {item.returned_quantity > 0 && (
                            <span> (Returned: {item.returned_quantity})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                  {!issue.returned ? (
                    <>
                      <button
                        onClick={() => handleFullReturn(issue.issue_id)}
                        style={{
                          padding: "0.5rem 1rem",
                          cursor: "pointer",
                          backgroundColor: "#4CAF50",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                        }}
                      >
                        Full Return
                      </button>
                      <button
                        onClick={() => openPartialReturn(issue)}
                        style={{
                          padding: "0.5rem 1rem",
                          cursor: "pointer",
                          backgroundColor: "#2196F3",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                        }}
                      >
                        Partial Return
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleReissue(issue)}
                      style={{
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        backgroundColor: "#FF9800",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                      }}
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
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowPartialReturn(false)}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2>Partial Return</h2>
            <p>Specify quantities to return for each item:</p>

            {selectedIssue.items.map(item => {
              const available = item.quantity - item.returned_quantity;
              const itemName = itemNames[item.item_no] || `Item #${item.item_no}`;
              return (
                <div key={item.item_no} style={{ marginBottom: "1rem" }}>
                  <label>
                    {itemName} (Available to return: {available}):
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
                        marginLeft: "1rem",
                        padding: "0.5rem",
                        width: "80px",
                      }}
                    />
                  </label>
                </div>
              );
            })}

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                onClick={() => handlePartialReturn(selectedIssue.issue_id)}
                style={{
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                }}
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
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}