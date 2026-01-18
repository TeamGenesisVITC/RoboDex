// app/inventory/[item_no]/page.tsx

"use client";
import { use, useEffect, useState } from "react";
import { api } from "@/app/lib/api";
import { IssueRow } from "@/app/types";
import IssueForm from "@/app/issue-form";

interface Props {
  params: Promise<{ item_no: string }>;
}

export default function ItemPage({ params }: Props) {
  // Use the `use` hook to unwrap the Promise
  const { item_no } = use(params);
  
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api<IssueRow[]>(`issues?item_no=eq.${item_no}&returned=eq.false`)
      .then(setIssues);
  }, [item_no]);

  return (
    <main>
      <h2>{item_no}</h2>
      <button onClick={() => setShowForm(true)}>Issue</button>
      {showForm && (
        <IssueForm item_no={item_no} onClose={() => setShowForm(false)} />
      )}
      <h3>Current Issues</h3>
      <ul>
        {issues.map(i => (
          <li key={i.id}>
            {i.quantity} → member {i.member_id}
          </li>
        ))}
      </ul>
    </main>
  );
}