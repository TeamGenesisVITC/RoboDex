"use client";

import { useState } from "react";
import { api } from "./lib/api";

interface Props {
  item_no: string;
  onClose: () => void;
}

export default function IssueForm({ item_no, onClose }: Props) {
  const [quantity, setQuantity] = useState<number>(1);
  const [returnDate, setReturnDate] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    await api("issue", {
      method: "POST",
      body: JSON.stringify({
        items: [{ item_no, quantity }],
        return_date: returnDate || null,
      }),
    });

    onClose();
    location.reload();
  }

  return (
    <form onSubmit={submit} className="modal">
      <h3>Issue {item_no}</h3>

      <input
        type="number"
        min={1}
        value={quantity}
        onChange={e => setQuantity(Number(e.target.value))}
      />

      <input
        type="date"
        value={returnDate}
        onChange={e => setReturnDate(e.target.value)}
      />

      <button type="submit">Confirm</button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </form>
  );
}
