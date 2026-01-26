// app/update-password/page.tsx

"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useRouter } from "next/navigation";
import { KeyRound, Check, X, User } from "lucide-react";

interface MemberInfo {
  member_id: string;
  name: string;
}

export default function UpdatePasswordPage() {
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Fetch current member info from token
    async function fetchMemberInfo() {
      try {
        const data = await api<MemberInfo>("me");
        setMemberInfo(data);
      } catch (err) {
        console.error("Failed to fetch member info:", err);
        setError("Failed to load member information");
      }
    }

    fetchMemberInfo();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    try {
      const response = await api<{ success: boolean; token: string }>("update-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      // Update token in localStorage
      if (response.token) {
        localStorage.setItem("token", response.token);
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect after success
      setTimeout(() => {
        router.push("/inventory");
      }, 2000);
    } catch (err) {
      setError("Failed to update password. Please check your current password.");
    }
  }

  if (!memberInfo) {
    return (
      <main style={{ 
        padding: "2rem", 
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Montserrat', sans-serif"
      }}>
        <p style={{ color: "#888", fontSize: "1.1rem" }}>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ 
      padding: "2rem", 
      minHeight: "100vh",
      backgroundColor: "#1a1a1a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Montserrat', sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "500px",
        backgroundColor: "#2a2a2a",
        borderRadius: "12px",
        border: "1px solid #3a3a3a",
        padding: "2.5rem",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "0.5rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "#5b1be3",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <KeyRound size={24} color="#ffffff" />
          </div>
          <h1 style={{
            margin: 0,
            color: "#e0e0e0",
            fontSize: "1.75rem",
            fontWeight: "600"
          }}>
            Update Password
          </h1>
        </div>

        {/* User Info */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1rem",
          backgroundColor: "#1a1a1a",
          borderRadius: "8px",
          border: "1px solid #3a3a3a",
          marginBottom: "2rem"
        }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "#8550e9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <User size={18} color="#ffffff" />
          </div>
          <div>
            <p style={{ 
              margin: 0, 
              color: "#888", 
              fontSize: "0.85rem" 
            }}>
              Logged in as
            </p>
            <p style={{ 
              margin: 0, 
              color: "#e0e0e0", 
              fontWeight: "600",
              fontSize: "1rem"
            }}>
              {memberInfo.name}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <label style={{ 
              display: "block", 
              marginBottom: "0.5rem", 
              fontWeight: "500",
              color: "#c0c0c0",
              fontSize: "0.95rem"
            }}>
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.875rem",
                backgroundColor: "#1a1a1a",
                border: "1px solid #3a3a3a",
                borderRadius: "8px",
                color: "#e0e0e0",
                fontSize: "1rem",
                fontFamily: "'Montserrat', sans-serif",
                outline: "none",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#5b1be3"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#3a3a3a"}
            />
          </div>

          <div>
            <label style={{ 
              display: "block", 
              marginBottom: "0.5rem", 
              fontWeight: "500",
              color: "#c0c0c0",
              fontSize: "0.95rem"
            }}>
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "0.875rem",
                backgroundColor: "#1a1a1a",
                border: "1px solid #3a3a3a",
                borderRadius: "8px",
                color: "#e0e0e0",
                fontSize: "1rem",
                fontFamily: "'Montserrat', sans-serif",
                outline: "none",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#5b1be3"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#3a3a3a"}
            />
            <small style={{ color: "#888", fontSize: "0.85rem" }}>
              Minimum 6 characters
            </small>
          </div>

          <div>
            <label style={{ 
              display: "block", 
              marginBottom: "0.5rem", 
              fontWeight: "500",
              color: "#c0c0c0",
              fontSize: "0.95rem"
            }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "0.875rem",
                backgroundColor: "#1a1a1a",
                border: "1px solid #3a3a3a",
                borderRadius: "8px",
                color: "#e0e0e0",
                fontSize: "1rem",
                fontFamily: "'Montserrat', sans-serif",
                outline: "none",
                transition: "border-color 0.2s ease",
                boxSizing: "border-box"
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#5b1be3"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#3a3a3a"}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#2d1a1a",
                color: "#ff6b6b",
                borderRadius: "8px",
                border: "1px solid #4a2020",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}
            >
              <X size={20} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#1a2d1a",
                color: "#66bb6a",
                borderRadius: "8px",
                border: "1px solid #204a20",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem"
              }}
            >
              <Check size={20} />
              <span>Password updated successfully! Redirecting...</span>
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: "1rem",
                backgroundColor: "#5b1be3",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                fontFamily: "'Montserrat', sans-serif",
                transition: "background-color 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#6d2ef5"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#5b1be3"}
            >
              Update Password
            </button>
            <button
              type="button"
              onClick={() => router.push("/inventory")}
              style={{
                flex: 1,
                padding: "1rem",
                backgroundColor: "#3a3a3a",
                color: "#e0e0e0",
                border: "1px solid #4a4a4a",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
                fontFamily: "'Montserrat', sans-serif",
                transition: "background-color 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#4a4a4a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#3a3a3a";
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}