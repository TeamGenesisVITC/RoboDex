// app/inventory/[item_no]/page.tsx

"use client";
import { use, useState, useEffect } from "react";
import IssueForm from "@/app/issue-form";
import { api } from "@/app/lib/api";

interface Props {
  params: Promise<{ item_no: string }>;
}

interface ItemDetails {
  item_no: string;
  name: string;
  available: number;
}

export default function ItemPage({ params }: Props) {
  const { item_no } = use(params);
  const [showForm, setShowForm] = useState(false);
  const [itemDetails, setItemDetails] = useState<ItemDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItemDetails() {
      try {
        // Fetch from registry endpoint with filter
        const data = await api<ItemDetails[]>(`registry?item_no=eq.${item_no}`);
        if (data && data.length > 0) {
          setItemDetails(data[0]);
        }
      } catch (err) {
        console.error("Failed to load item details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchItemDetails();
  }, [item_no]);

  if (loading) {
    return <main style={{ padding: "2rem" }}>Loading...</main>;
  }

  if (!itemDetails) {
    return <main style={{ padding: "2rem" }}>Item not found</main>;
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h2>{itemDetails.name}</h2>
      <p style={{ fontSize: "0.9em", color: "#666" }}>
        <strong>Item No:</strong> {itemDetails.item_no}
      </p>
      <p><strong>Available Quantity:</strong> {itemDetails.available}</p>
      
      <button 
        onClick={() => setShowForm(true)}
        disabled={itemDetails.available === 0}
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: itemDetails.available === 0 ? "#ccc" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: itemDetails.available === 0 ? "not-allowed" : "pointer",
          marginTop: "1rem",
        }}
      >
        {itemDetails.available === 0 ? "Out of Stock" : "Issue Item"}
      </button>
      
      {showForm && (
        <IssueForm 
          item_no={item_no}
          itemName={itemDetails.name}
          onClose={() => setShowForm(false)} 
        />
      )}
    </main>
  );
}