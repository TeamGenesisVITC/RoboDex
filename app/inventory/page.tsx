"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { InventoryItem } from "../types";
import { useRouter } from "next/navigation";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    api<InventoryItem[]>("registry").then(setItems);
  }, []);

  return (
    <main>
      <h1>Inventory</h1>

      <ul>
        {items.map(item => {
          const disabled = item.available === 0;

          return (
            <li
              key={item.item_no}
              onClick={() =>
                !disabled && router.push(`/inventory/${item.item_no}`)
              }
              style={{
                opacity: disabled ? 0.4 : 1,
                pointerEvents: disabled ? "none" : "auto",
              }}
            >
              <strong>{item.name}</strong>
              <div>Available: {item.available}</div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
