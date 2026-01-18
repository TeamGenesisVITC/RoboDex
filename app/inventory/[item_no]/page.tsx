// app/inventory/[item_no]/page.tsx

"use client";
import { use, useState } from "react";
import IssueForm from "@/app/issue-form";

interface Props {
  params: Promise<{ item_no: string }>;
}

export default function ItemPage({ params }: Props) {
  const { item_no } = use(params);
  const [showForm, setShowForm] = useState(false);

  return (
    <main>
      <h2>Item: {item_no}</h2>
      <button onClick={() => setShowForm(true)}>Issue Item</button>
      
      {showForm && (
        <IssueForm 
          item_no={item_no} 
          onClose={() => setShowForm(false)} 
        />
      )}
      
      <p>Click the Issue button to assign this item to a project.</p>
    </main>
  );
}