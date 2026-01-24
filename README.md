# RoboDex (Protodex)

A comprehensive team management and inventory tracking system built for Team Genesis. Manage inventory, track issued items, organize projects, and integrate with GitHub and Notion — all in one place.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)

## 🎯 What is RoboDex?

RoboDex is an inventory and project management system designed for robotics teams and makerspaces. It helps you:

- **Track Inventory**: Know exactly what parts you have, where they are, and what's available
- **Manage Issues**: Issue items to projects, track who has what, handle returns
- **Organize Projects**: Link projects to Notion workspaces, GitHub repos, and documentation
- **Team Management**: Manage team members, assign managers, organize into pools

## 📸 Features at a Glance

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Secure JWT-based login system |
| 📦 **Inventory Browser** | Fuzzy search, availability tracking, location info |
| 🛒 **Cart System** | Batch issue multiple items to projects |
| 📋 **Issue Tracking** | Full/partial returns, reissue capability |
| 📊 **Project Analytics** | Track items issued per project |
| 🔗 **GitHub Integration** | View issues, PRs, and contributors |
| 📝 **Notion Integration** | Embed Notion workspaces in project pages |
| 📱 **PWA Support** | Install as app, works offline |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   (Next.js 15 + React 18)                   │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │Inventory │  │  Issues  │  │ Projects │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │ REST API
┌─────────────────────────┼────────────────────────────────────┐
│                         ▼                                    │
│                     Backend                                  │
│           (Cloudflare Workers + Python)                     │
│                         │                                    │
│         ┌───────────────┼───────────────┐                   │
│         │               │               │                   │
│         ▼               ▼               ▼                   │
│    ┌─────────┐    ┌─────────┐    ┌─────────┐              │
│    │Supabase │    │ GitHub  │    │  JWT    │              │
│    │   DB    │    │   API   │    │  Auth   │              │
│    └─────────┘    └─────────┘    └─────────┘              │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.11+
- npm or yarn
- A Supabase account
- (Optional) Cloudflare account for deployment

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/RoboDex.git
cd RoboDex
```

### 2. Set Up the Database

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase.sql`
3. Copy your project URL and service key

### 3. Set Up the Backend

```bash
cd robodex-backend

# Install dependencies
npm install

# Create environment file
cp wrangler.jsonc.example wrangler.jsonc

# Add your secrets (edit wrangler.jsonc or use wrangler secret)
# Required: SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
# Optional: GITHUB_TOKEN

# Run locally
npm run dev
```

### 4. Set Up the Frontend

```bash
# From root directory
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8787" > .env.local

# Run development server
npm run dev
```

### 5. Open the App

Visit `http://localhost:3000` and log in!

## 📁 Project Structure

```
RoboDex/
├── app/                    # Next.js frontend (App Router)
│   ├── page.tsx           # Login page
│   ├── layout.tsx         # Root layout with providers
│   ├── types.ts           # TypeScript interfaces
│   ├── globals.css        # Global styles (Tailwind)
│   ├── lib/
│   │   └── api.ts         # API client utility
│   ├── context/
│   │   └── CartContext.tsx # Cart state management
│   ├── inventory/         # Inventory browsing
│   ├── cart/              # Shopping cart
│   ├── issues/            # Issue management
│   ├── projects/          # Project management
│   └── update-password/   # Password change
│
├── robodex-backend/       # Python Cloudflare Worker
│   ├── src/
│   │   └── entry.py       # Main API logic
│   ├── wrangler.jsonc     # Cloudflare config
│   └── pyproject.toml     # Python dependencies
│
├── public/                # Static assets & PWA
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service worker
│
├── supabase.sql           # Database schema
└── README.md              # You are here!
```

## 🔧 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework with App Router |
| React 18 | UI components |
| TypeScript 5 | Type safety |
| TailwindCSS 4 | Utility-first styling |
| next-pwa | Progressive Web App support |

### Backend
| Technology | Purpose |
|------------|---------|
| Cloudflare Workers | Serverless runtime |
| Python 3.11 | Backend language |
| webtypy | Request handling |
| Supabase | PostgreSQL database |
| JWT | Authentication tokens |

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Frontend README](./app/README.md) | Frontend architecture and components |
| [Backend README](./robodex-backend/README.md) | API endpoints and backend logic |
| [API Reference](./docs/API.md) | Complete API documentation |
| [Contributing Guide](./CONTRIBUTING.md) | How to contribute |
| [Database Schema](./docs/DATABASE.md) | Database tables and functions |

## 🔑 Environment Variables

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8787  # Backend URL
```

### Backend (`wrangler.jsonc` or Cloudflare secrets)

```env
SUPABASE_URL=https://xxx.supabase.co       # Supabase project URL
SUPABASE_SERVICE_KEY=eyJ...                # Supabase service role key
JWT_SECRET=your-secret-key                 # JWT signing secret
GITHUB_TOKEN=ghp_...                       # (Optional) GitHub API token
```

## 🎨 Design System

RoboDex uses a dark theme with purple accents:

| Element | Color |
|---------|-------|
| Background | `#1a1a1a` |
| Card Background | `#2a2a2a` |
| Primary Accent | `#b19cd9` |
| Secondary Accent | `#8b7ab8` |
| Success | `#7ab87a` |
| Error | `#c97a7a` |
| Text Primary | `#e0e0e0` |
| Text Secondary | `#888888` |

Font: **Montserrat** (headings and UI) + **Geist** (code)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built for **Team Genesis**
- Powered by [Supabase](https://supabase.com), [Cloudflare Workers](https://workers.cloudflare.com), and [Next.js](https://nextjs.org)

---

<p align="center">
  Made with 💜 by Team Genesis
</p>
