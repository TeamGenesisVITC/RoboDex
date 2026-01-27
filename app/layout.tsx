"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "./context/CartContext";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Home, Package, ShoppingCart, TicketSlash, Bot, User, LogOut, KeyRound, CalendarDays } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Note: metadata export needs to be in a separate server component file
// You'll need to create app/metadata.ts or keep this in a server layout wrapper

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>("Loading...");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setUserName("Guest");
          return;
        }

        const response = await fetch('https://robodex-backend.imsawant05.workers.dev/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserName(data.name || "User");
        } else {
          setUserName("User");
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        setUserName("User");
      }
    };

    fetchUserData();
  }, [pathname]); // Re-fetch when pathname changes

  const menuItems = [
    //{ name: "Home", path: "/", icon: <Home size={20} /> },
    { name: "Home", path: "/home", icon: <Home size={20} /> },
    { name: "Inventory", path: "/inventory", icon: <Package size={20} /> },
    { name: "Cart", path: "/cart", icon: <ShoppingCart size={20} /> },
    { name: "Issues", path: "/issues", icon: <TicketSlash size={20} /> },
    { name: "Projects", path: "/projects", icon: <Bot size={20} /> },
    { name: "Calendar", path: "/calendar", icon: <CalendarDays size={20} /> },
  ];

  const handleNavigate = (path: string) => {
    router.push(path);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
    setSidebarOpen(false);
  };

  const handleUpdatePassword = () => {
    router.push('/update-password');
    setSidebarOpen(false);
  };

  // Check if we're on the login/home page
  const isLoginPage = pathname === '/';

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </head>
      <body 
        className={`${geistSans.variable} ${geistMono.variable}`}
        style={{ margin: 0, padding: 0, fontFamily: "'Montserrat', sans-serif" }}
      >
        <CartProvider>
          {/* Top Navigation Bar - Hidden on login page */}
          {!isLoginPage && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              height: "4rem",
              backgroundColor: "#1a1a1a",
              borderBottom: "1px solid #3a3a3a",
              display: "flex",
              alignItems: "center",
              padding: "0 1rem",
              gap: "1rem",
              zIndex: 1001
            }}>
              {/* Hamburger Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "6px",
                  padding: "0.75rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                  color: "#e0e0e0",
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#5b1be3";
                  e.currentTarget.style.backgroundColor = "#2d2d2d";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#3a3a3a";
                  e.currentTarget.style.backgroundColor = "#2a2a2a";
                }}
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* Logo */}
              <img 
                src="/logo_main.png" 
                alt="Protodex Logo" 
                style={{
                  height: "2.5rem",
                  width: "auto",
                  objectFit: "contain"
                }}
              />
            </div>
          )}

          {/* Overlay */}
          {!isLoginPage && sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: 999,
                backdropFilter: "blur(4px)"
              }}
            />
          )}

          {/* Sidebar - Hidden on login page */}
          {!isLoginPage && (
            <div
              style={{
                position: "fixed",
                top: "4rem",
                left: sidebarOpen ? 0 : "-280px",
                width: "280px",
                height: "calc(100vh - 4rem)",
                backgroundColor: "#1a1a1a",
                borderRight: "1px solid #3a3a3a",
                zIndex: 1000,
                transition: "left 0.3s ease",
                display: "flex",
                flexDirection: "column"
              }}
            >
            {/* Logo/Title */}
            <div style={{
              padding: "1.5rem",
              borderBottom: "1px solid #3a3a3a",
              flexShrink: 0
            }}>
              <h2 style={{
                margin: 0,
                color: "#8550e9",
                fontSize: "1.5rem",
                fontWeight: "600",
                letterSpacing: "0.5px"
              }}>
                Team Genesis
              </h2>
              <p style={{
                margin: "0.25rem 0 0 0",
                color: "#888",
                fontSize: "0.85rem"
              }}>
                Proud to Bleed Purple
              </p>
            </div>

            {/* Menu Items - Scrollable */}
            <nav style={{ 
              padding: "1rem 1rem",
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE and Edge
            }}
            className="hide-scrollbar"
            >
              {menuItems.map((item) => {
                const isActive = pathname === item.path || 
                                (item.path !== "/" && pathname.startsWith(item.path));
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "#2a2a2a";
                        e.currentTarget.style.color = "#e0e0e0";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#c0c0c0";
                      }
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      padding: "1rem",
                      marginBottom: "0.5rem",
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: isActive ? "#2a2a4a" : "transparent",
                      color: isActive ? "#8550e9" : "#c0c0c0",
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: isActive ? "600" : "normal",
                      transition: "all 0.2s ease",
                      textAlign: "left",
                      borderLeft: isActive ? "3px solid #5b1be3" : "3px solid transparent"
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center" }}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div style={{
              padding: "1rem",
              borderTop: "1px solid #3a3a3a",
              backgroundColor: "#1a1a1a",
              flexShrink: 0
            }}>
              {/* User Info */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
                padding: "0.75rem",
                backgroundColor: "#2a2a2a",
                borderRadius: "6px"
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#5b1be3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <User size={20} color="#ffffff" />
                </div>
                <div style={{
                  flex: 1,
                  minWidth: 0
                }}>
                  <p style={{
                    margin: 0,
                    color: "#e0e0e0",
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {userName}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1rem"
              }}>
                <button
                  onClick={handleUpdatePassword}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: "#e0e0e0",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: "500",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    //e.currentTarget.style.backgroundColor = "#353560";
                    e.currentTarget.style.border = "1px solid #5b1be3";
                    e.currentTarget.style.color = "#5b1be3";
                  }}
                  onMouseLeave={(e) => {
                    //e.currentTarget.style.backgroundColor = "#2a2a2a";
                    e.currentTarget.style.border = "1px solid #3a3a3a";
                    e.currentTarget.style.color = "#e0e0e0";
                  }}
                >
                  <KeyRound size={16} />
                  Update
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #3a3a3a",
                    borderRadius: "6px",
                    color: "#e0e0e0",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: "500",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#3a3a3a";
                    e.currentTarget.style.borderColor = "#ff4444";
                    e.currentTarget.style.color = "#ff6666";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#2a2a2a";
                    e.currentTarget.style.borderColor = "#3a3a3a";
                    e.currentTarget.style.color = "#e0e0e0";
                  }}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>

              <p style={{
                margin: 0,
                color: "#666",
                fontSize: "0.75rem",
                textAlign: "center"
              }}>
                #BuiltWith💜forGenesis
              </p>
            </div>
          </div>
          )}

          {/* Main Content */}
          <div style={{
            minHeight: "100vh",
            backgroundColor: "#1a1a1a",
            paddingTop: isLoginPage ? "0" : "4rem"
          }}>
            {children}
          </div>
        </CartProvider>
      </body>
    </html>
  );
}