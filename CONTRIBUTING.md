# Contributing to RoboDex

Thank you for your interest in contributing to RoboDex! This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Need Help?](#need-help)

---

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something cool together.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm or yarn
- Git

### Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR-USERNAME/RoboDex.git
cd RoboDex
git remote add upstream https://github.com/original/RoboDex.git
```

### Set Up Development Environment

**Frontend:**
```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8787" > .env.local
npm run dev
```

**Backend:**
```bash
cd robodex-backend
npm install
# Set up secrets in wrangler.jsonc
npm run dev
```

**Database:**
1. Create a Supabase project
2. Run `supabase.sql` in the SQL editor
3. Add credentials to backend

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/fixes

### 2. Make Your Changes

- Write clear, readable code
- Add comments where logic is complex
- Update documentation if needed
- Test your changes thoroughly

### 3. Test Locally

```bash
# Frontend
npm run build
npm run lint

# Backend - test endpoints manually
curl http://localhost:8787/your-endpoint
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add new inventory filter"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

---

## Coding Standards

### TypeScript/React (Frontend)

```typescript
// ✅ Good
interface InventoryItem {
  itemNo: string;
  name: string;
  quantity: number;
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {item.name}
    </div>
  );
}

// ❌ Avoid
function inventoryCard(props) {
  var hovered = false;
  // ...
}
```

**Guidelines:**
- Use functional components with hooks
- Define TypeScript interfaces for all data
- Use destructuring for props
- Keep components focused and small
- Handle loading and error states

### Python (Backend)

```python
# ✅ Good
def get_inventory_item(item_no: str) -> dict | None:
    """Fetch a single inventory item by its ID."""
    result = supabase.table("inventory").select("*").eq("item_no", item_no).execute()
    return result.data[0] if result.data else None

# ❌ Avoid
def getItem(id):
    return supabase.table("inventory").select("*").eq("item_no", id).execute().data[0]
```

**Guidelines:**
- Use type hints
- Add docstrings for functions
- Handle errors gracefully
- Return meaningful error messages

### CSS/Styling

We use inline styles for consistency:

```typescript
// ✅ Good - using style constants
const cardStyle = {
  backgroundColor: "#2a2a2a",
  border: "1px solid #3a3a3a",
  borderRadius: "6px",
  padding: "1.5rem",
};

// ❌ Avoid - magic values everywhere
<div style={{ backgroundColor: "#2a2a2a", border: "1px solid #3a3a3a" }}>
```

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change, no new feature or fix |
| `test` | Adding tests |
| `chore` | Maintenance tasks |

### Examples

```bash
feat(inventory): add fuzzy search functionality
fix(cart): resolve quantity validation bug
docs(api): update endpoint documentation
refactor(auth): simplify token validation logic
```

---

## Pull Request Process

### Before Submitting

- [ ] Code compiles without errors
- [ ] All existing tests pass
- [ ] New code is tested
- [ ] Documentation is updated
- [ ] Commits follow guidelines
- [ ] Branch is up to date with main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## How Has This Been Tested?
Describe testing approach

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] My code follows the project style
- [ ] I have updated documentation
- [ ] I have added tests
```

### Review Process

1. Submit PR against `main` branch
2. Automated checks run
3. Request review from maintainers
4. Address feedback
5. Once approved, maintainer merges

---

## Project Structure

```
RoboDex/
├── app/                    # Frontend (Next.js)
│   ├── page.tsx           # Login page
│   ├── layout.tsx         # Root layout
│   ├── types.ts           # TypeScript types
│   ├── lib/api.ts         # API client
│   ├── context/           # React contexts
│   ├── inventory/         # Inventory pages
│   ├── cart/              # Cart pages
│   ├── issues/            # Issues pages
│   └── projects/          # Project pages
│
├── robodex-backend/       # Backend (Cloudflare Workers)
│   └── src/entry.py       # Main API
│
├── docs/                  # Documentation
│   ├── API.md             # API reference
│   └── DATABASE.md        # Database schema
│
├── public/                # Static assets
└── supabase.sql           # Database setup
```

### Key Files to Know

| File | Purpose |
|------|---------|
| `app/lib/api.ts` | All API calls go through here |
| `app/types.ts` | Shared TypeScript interfaces |
| `app/context/CartContext.tsx` | Global cart state |
| `robodex-backend/src/entry.py` | All backend logic |
| `supabase.sql` | Database schema and functions |

---

## Adding New Features

### Adding a New Frontend Page

1. Create folder: `app/your-feature/`
2. Add `page.tsx`:
   ```typescript
   "use client";
   
   export default function YourFeaturePage() {
     return <main>Your content</main>;
   }
   ```
3. Add navigation link in `layout.tsx`
4. Add types to `types.ts` if needed

### Adding a New API Endpoint

1. Add route handler in `robodex-backend/src/entry.py`
2. Add database table/function in `supabase.sql` if needed
3. Document in `docs/API.md`
4. Add TypeScript types in frontend

### Adding a New Database Table

1. Add CREATE TABLE in `supabase.sql`
2. Add any needed functions
3. Document in `docs/DATABASE.md`
4. Add corresponding API endpoints

---

## Need Help?

- **Questions?** Open a GitHub Discussion
- **Found a bug?** Open an Issue
- **Have an idea?** Open an Issue with `[Feature Request]` prefix

---

## Recognition

Contributors are recognized in our README. Thank you for helping make RoboDex better!

---

<p align="center">
  Happy coding! 🚀
</p>
