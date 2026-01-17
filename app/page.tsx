"use client";

import { useState } from "react";
import { api } from "./lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const res = await api<{ token: string }>("login", {
      method: "POST",
      body: JSON.stringify({ name, password }),
    });

    localStorage.setItem("token", res.token);
    router.push("/inventory");
  }

  return (
    <main className="center">
      <form onSubmit={submit}>
        <h1>Login</h1>

        <input
          required
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          required
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>
      </form>
    </main>
  );
}
