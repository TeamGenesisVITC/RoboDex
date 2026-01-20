// app/login/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("https://robodex-backend.imsawant05.workers.dev/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, password }),
      });

      if (!response.ok) {
        setError("Invalid credentials");
        return;
      }

      const data = await response.json();
      
      // Store token in localStorage
      localStorage.setItem("token", data.token);
      
      console.log("Login successful! Token:", data.token.substring(0, 20) + "...");
      
      // Redirect to inventory
      router.push("/inventory");
    } catch (err) {
      setError("Login failed: " + (err as Error).message);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
      <h1>Login to Robodex</h1>
      
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label>
            Name:
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
        </div>

        <div>
          <label>
            Password:
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
            />
          </label>
        </div>

        {error && <div style={{ color: "red" }}>{error}</div>}

        <button type="submit" style={{ padding: "0.75rem", cursor: "pointer" }}>
          Login
        </button>
      </form>
    </main>
  );
}