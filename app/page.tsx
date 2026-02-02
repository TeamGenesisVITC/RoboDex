// app/login/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
      
      // Fetch user data from /me endpoint
      const meResponse = await fetch("https://robodex-backend.imsawant05.workers.dev/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${data.token}`,
        },
      });

      if (meResponse.ok) {
        const userData = await meResponse.json();
        
        // Store user data in sessionStorage
        sessionStorage.setItem("member_id", userData.member_id);
        sessionStorage.setItem("name", userData.name);
        sessionStorage.setItem("department", userData.department);
        sessionStorage.setItem("phone", userData.phone);
        sessionStorage.setItem("clearance", userData.clearance.toString());
        
        console.log("User data stored:", userData);
      } else {
        console.error("Failed to fetch user data");
      }
      
      // Redirect to inventory
      router.push("/home");
    } catch (err) {
      setError("Login failed: " + (err as Error).message);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#1a1a1a",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "1rem",
      fontFamily: "'Montserrat', sans-serif"
    }}>
      <div style={{
        backgroundColor: "#2a2a2a",
        border: "1px solid #3a3a3a",
        borderRadius: "6px",
        padding: "2.5rem",
        maxWidth: "420px",
        width: "100%",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
      }}>
        {/* Logo */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "2rem"
        }}>
          <Image
            src="/logo_main.png"
            alt="Protodex Logo"
            width={600}
            height={600}
            style={{
              objectFit: "contain"
            }}
          />
        </div>

        {/* Title */}
        <h1 style={{
          color: "#6a2eec",
          fontSize: "1.75rem",
          fontWeight: "600",
          textAlign: "center",
          marginBottom: "0.5rem",
          letterSpacing: "0.5px"
        }}>
          Welcome Back
        </h1>
        
        <p style={{
          color: "#888",
          textAlign: "center",
          marginBottom: "2rem",
          fontSize: "0.9rem"
        }}>
          Sign in to access Protodex
        </p>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem"
        }}>
          <div>
            <label style={{
              display: "block",
              marginBottom: "0.5rem",
              color: "#c0c0c0",
              fontSize: "0.9rem",
              fontWeight: "500"
            }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Enter your name"
              style={{
                width: "100%",
                padding: "0.875rem",
                fontSize: "1rem",
                backgroundColor: "#232323",
                border: "1px solid #3a3a3a",
                borderRadius: "4px",
                color: "#e0e0e0",
                outline: "none",
                fontFamily: "'Montserrat', sans-serif",
                transition: "all 0.3s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
              onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
            />
          </div>

          <div>
            <label style={{
              display: "block",
              marginBottom: "0.5rem",
              color: "#c0c0c0",
              fontSize: "0.9rem",
              fontWeight: "500"
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              style={{
                width: "100%",
                padding: "0.875rem",
                fontSize: "1rem",
                backgroundColor: "#232323",
                border: "1px solid #3a3a3a",
                borderRadius: "4px",
                color: "#e0e0e0",
                outline: "none",
                fontFamily: "'Montserrat', sans-serif",
                transition: "all 0.3s ease"
              }}
              onFocus={(e) => e.target.style.borderColor = "#5b1be3"}
              onBlur={(e) => e.target.style.borderColor = "#3a3a3a"}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: "rgba(201, 122, 122, 0.15)",
              border: "1px solid #c97a7a",
              borderRadius: "4px",
              padding: "0.75rem",
              color: "#c97a7a",
              fontSize: "0.9rem",
              textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "0.875rem",
              fontSize: "1rem",
              fontWeight: "600",
              backgroundColor: "#6930e4",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: "'Montserrat', sans-serif",
              transition: "all 0.3s ease",
              marginTop: "0.5rem"
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#3d17a5"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#572db2"}
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}