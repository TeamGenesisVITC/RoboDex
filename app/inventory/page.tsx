"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { InventoryItem } from "../types";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    api<InventoryItem[]>("registry").then(setItems);
  }, []);

  // Fuzzy search function
  const fuzzyMatch = (str: string, query: string): number => {
    if (!query) return 1;
    
    str = str.toLowerCase();
    query = query.toLowerCase();
    
    // Exact match gets highest score
    if (str.includes(query)) return 1;
    
    let score = 0;
    let queryIndex = 0;
    let lastMatchIndex = -1;
    
    for (let i = 0; i < str.length && queryIndex < query.length; i++) {
      if (str[i] === query[queryIndex]) {
        score += 1;
        // Bonus for consecutive matches
        if (lastMatchIndex === i - 1) {
          score += 0.5;
        }
        lastMatchIndex = i;
        queryIndex++;
      }
    }
    
    // Return normalized score (0-1)
    // Only return a score if all query characters were found
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
    .filter(item => item.searchScore > 0.3) // Threshold for matching
    .sort((a, b) => b.searchScore - a.searchScore); // Sort by relevance

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
        <h1 style={{
          color: "#b19cd9",
          fontSize: "2.5rem",
          fontWeight: "600",
          marginBottom: "2rem",
          letterSpacing: "0.5px"
        }}>
          Inventory
        </h1>

        {/* Search Box */}
        <div style={{
          marginBottom: "2rem"
        }}>
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
              e.target.style.borderColor = "#8b7ab8";
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
                onClick={() => !disabled && router.push(`/inventory/${item.item_no}`)}
                style={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.5 : 1,
                  transition: "all 0.3s ease",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => {
                  if (!disabled) {
                    e.currentTarget.style.borderColor = "#8b7ab8";
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
                {/* Item Name */}
                <h3 style={{
                  color: "#b19cd9",
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  lineHeight: "1.4"
                }}>
                  {item.name}
                </h3>

                {/* Details Grid */}
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
                      color: item.available === 0 ? "#d66" : "#7ab87a",
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

                {/* Out of Stock Badge */}
                {disabled && (
                  <div style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    backgroundColor: "#4a3a3a",
                    color: "#d66",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "4px",
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

        {/* No Results Message */}
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
    </main>
  );
}