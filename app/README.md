# Frontend Documentation

The RoboDex frontend is built with **Next.js 15** using the App Router architecture. This document covers the structure, components, and patterns used throughout the application.

## 📁 Directory Structure

```
app/
├── page.tsx                 # Login page (/)
├── layout.tsx               # Root layout with CartProvider
├── types.ts                 # Shared TypeScript interfaces
├── globals.css              # Global styles + Tailwind imports
├── issue-form.tsx           # Reusable issue form component
│
├── lib/
│   └── api.ts               # API client utility
│
├── context/
│   └── CartContext.tsx      # Cart state management (React Context)
│
├── inventory/
│   ├── page.tsx             # Inventory listing (/inventory)
│   └── [item_no]/
│       └── page.tsx         # Item details (redirects to main page)
│
├── cart/
│   └── page.tsx             # Shopping cart (/cart)
│
├── issues/
│   └── page.tsx             # Issue management (/issues)
│
├── projects/
│   ├── page.tsx             # Projects listing (/projects)
│   └── [project_id]/
│       └── page.tsx         # Project details (/projects/:id)
│
└── update-password/
    └── page.tsx             # Password change (/update-password)
```

## 🧩 Core Components

### Layout (`layout.tsx`)

The root layout wraps the entire application with:
- **CartProvider**: Global cart state
- **Navigation**: Consistent header across all pages
- **Font loading**: Geist Sans and Geist Mono
- **PWA support**: Metadata and manifest

```tsx
// Key structure
<html>
  <body>
    <CartProvider>
      <Navigation />
      {children}
    </CartProvider>
  </body>
</html>
```

### API Client (`lib/api.ts`)

A centralized fetch wrapper that handles:
- Base URL configuration
- JWT token injection
- Error handling
- Response parsing

```typescript
// Usage
import { api } from "@/app/lib/api";

// GET request
const items = await api<InventoryItem[]>("registry");

// POST request
await api("issue", {
  method: "POST",
  body: JSON.stringify(payload),
});

// With query params
const item = await api<Item[]>(`registry?item_no=eq.${id}`);
```

### Cart Context (`context/CartContext.tsx`)

Global state for the shopping cart using React Context:

```typescript
interface CartItem {
  item_no: string;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item_no: string, quantity: number) => void;
  removeFromCart: (item_no: string) => void;
  updateQuantity: (item_no: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (item_no: string) => number;
}
```

**Features:**
- Persists to localStorage
- Syncs across tabs
- Quantity management

## 📄 Page Components

### Login Page (`page.tsx`)

**Route:** `/`

The entry point for unauthenticated users.

| Feature | Implementation |
|---------|----------------|
| Form fields | Name, Password |
| Validation | Client-side required fields |
| Auth flow | POST to `/login`, store JWT in localStorage |
| Redirect | Navigates to `/inventory` on success |

### Inventory Page (`inventory/page.tsx`)

**Route:** `/inventory`

Browse and search all inventory items.

| Feature | Implementation |
|---------|----------------|
| Fuzzy search | Custom algorithm matching name and location |
| Item cards | Grid layout with availability status |
| Item modal | Detailed view with issue/cart actions |
| Project select | Dropdown populated from API |
| Issue form | Quantity, project, and return date |

**Key Functions:**
```typescript
// Fuzzy matching algorithm
const fuzzyMatch = (str: string, query: string): number => {
  // Returns score 0-1, higher = better match
};

// Filter and sort by relevance
const filteredItems = items
  .map(item => ({ ...item, searchScore: fuzzyMatch(...) }))
  .filter(item => item.searchScore > 0.3)
  .sort((a, b) => b.searchScore - a.searchScore);
```

### Cart Page (`cart/page.tsx`)

**Route:** `/cart`

Manage items before batch issuing.

| Feature | Implementation |
|---------|----------------|
| Item list | Shows all cart items with details |
| Quantity edit | Inline number input |
| Remove items | Per-item delete button |
| Batch issue | Issue all items to selected project |
| Clear cart | Remove all items |

### Issues Page (`issues/page.tsx`)

**Route:** `/issues`

View and manage personal issued items.

| Feature | Implementation |
|---------|----------------|
| Issue grouping | Groups by `issue_id` |
| Full return | Return all items in an issue |
| Partial return | Return specific quantity |
| Reissue | Re-issue previously returned items |
| Status display | Shows returned vs active |

**Issue States:**
- **Active**: `returned = false`, can be returned
- **Returned**: `returned = true`, can be reissued

### Projects Page (`projects/page.tsx`)

**Route:** `/projects`

List all projects with quick stats.

| Feature | Implementation |
|---------|----------------|
| Project cards | Name, description preview |
| Navigation | Click to view details |

### Project Detail Page (`projects/[project_id]/page.tsx`)

**Route:** `/projects/:project_id`

Comprehensive project management with tabbed interface.

**Tabs:**

| Tab | Content |
|-----|---------|
| **Overview** | Description, team members, issued items |
| **Notion** | Embedded Notion workspace |
| **GitHub** | Issues, PRs, contributors chart |
| **Docs** | External documentation links |
| **Settings** | Edit project configuration |

**GitHub Integration:**
```typescript
// Fetches from backend proxy
const [issues, prs, contributors] = await Promise.all([
  api<GitHubIssue[]>(`github/${repoName}`),
  api<GitHubPR[]>(`github/${repoName}/pulls`),
  api<GitHubContributor[]>(`github/${repoName}/contributors`)
]);
```

### Update Password Page (`update-password/page.tsx`)

**Route:** `/update-password`

Secure password change form.

| Validation | Rule |
|------------|------|
| Required | All fields must be filled |
| Match | New password must match confirmation |
| Length | Minimum 6 characters |
| Different | New must differ from current |

## 🎨 Styling Approach

RoboDex uses **inline styles** for component-level styling with a consistent design system.

### Why Inline Styles?

1. **No CSS conflicts**: Styles are scoped to components
2. **Dynamic values**: Easy to compute styles based on state
3. **Type safety**: TypeScript catches invalid style properties
4. **No build step**: No CSS extraction or purging needed

### Style Constants

```typescript
// Common style patterns used throughout
const styles = {
  background: "#1a1a1a",
  cardBg: "#2a2a2a",
  border: "#3a3a3a",
  accent: "#b19cd9",
  accentHover: "#8b7ab8",
  success: "#7ab87a",
  error: "#c97a7a",
  text: "#e0e0e0",
  textMuted: "#888888",
};
```

### Interactive States

Components handle hover/focus with `onMouseEnter`/`onMouseLeave`:

```tsx
<div
  style={{ backgroundColor: "#2a2a2a" }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = "#2d2d2d";
    e.currentTarget.style.borderColor = "#8b7ab8";
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = "#2a2a2a";
    e.currentTarget.style.borderColor = "#3a3a3a";
  }}
>
```

## 🔒 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│  API     │────▶│  Store   │
│  Form    │     │ /login   │     │  Token   │
└──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│Protected │◀────│ api.ts   │◀────│  Read    │
│  Pages   │     │ injects  │     │  Token   │
└──────────┘     └──────────┘     └──────────┘
```

**Token Storage:** `localStorage.token`

**Token Usage:** Automatically added to all API requests via `api.ts`

```typescript
// In api.ts
const token = localStorage.getItem("token");
if (token) {
  headers["Authorization"] = `Bearer ${token}`;
}
```

## 📱 PWA Configuration

RoboDex is a Progressive Web App:

| Feature | File |
|---------|------|
| Manifest | `public/manifest.json` |
| Service Worker | `public/sw.js` |
| Workbox | `public/workbox-*.js` |

**Capabilities:**
- Install to home screen
- Offline caching
- Background sync (planned)

## 🧪 Type Definitions (`types.ts`)

```typescript
// Core data types
export interface InventoryItem {
  item_no: string;
  name: string;
  quantity: number;
  available: number;
  price?: string | number | null;
  location?: string | null;
  resources?: string | null;
}

export interface Issue {
  issue_id: string;
  item_no: string;
  item_name: string;
  quantity: number;
  issue_date: string;
  expected_return_date: string | null;
  returned: boolean;
  returned_quantity?: number;
  project_id: string;
  project_name: string;
}

export interface Project {
  project_id: string;
  project_name: string;
  description?: string;
  notion_page_id?: string;
  github_repo?: string;
  doc_urls?: { name: string; url: string }[];
  members?: string[];
  managers?: string[];
  pool?: string;
}

export interface Member {
  member_id: string;
  name: string;
  phone?: string;
  email?: string;
}
```

## 🚀 Development

### Running Locally

```bash
# Install dependencies
npm install

# Set environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8787" > .env.local

# Start dev server
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Code Style

- **Components**: Functional components with hooks
- **State**: useState for local, Context for global
- **Effects**: useEffect for data fetching and side effects
- **Naming**: PascalCase for components, camelCase for functions

## 📝 Adding New Features

### Adding a New Page

1. Create directory: `app/your-feature/`
2. Add `page.tsx` with `"use client"` directive
3. Export default function component
4. Add navigation link in `layout.tsx`

### Adding to Cart Context

1. Define new action in `CartContextType`
2. Implement in `CartProvider`
3. Export from context
4. Use with `useCart()` hook

### Adding New API Calls

```typescript
// Define response type
interface NewFeatureResponse {
  id: string;
  data: string;
}

// Make the call
const result = await api<NewFeatureResponse>("new-endpoint", {
  method: "POST",
  body: JSON.stringify({ key: "value" }),
});
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Token not found" | Redirect to login, clear localStorage |
| API CORS errors | Check backend URL in `.env.local` |
| Hydration mismatch | Ensure client-only code uses `useEffect` |
| Style not applying | Check for typos in style object keys |

---

For more information, see the [main README](../README.md) or [API documentation](../docs/API.md).
