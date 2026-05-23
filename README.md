# 🚀 Automated Devlog Web App

A clean, minimalist, dark glassmorphism devlog that renders developer notes directly from code comments. No CMS, no databases, no Markdown files. The code comments in your repositories are the single source of truth.

## 💡 Concept

Instead of leaving your editor to write blog posts or maintain a separate CMS, you write specialized comment blocks directly inside your source files next to the implementation details. 

This React+Vite app fetches repository file trees, parses source files for matching comment blocks at runtime, groups them by project and file, and renders them in a unified devlog dashboard.

---

## 📝 Comment Syntax

To declare a devlog entry, write a block comment starting with `/** blog:` in any supported source file (`.js`, `.ts`, `.jsx`, `.tsx`, `.py`, `.go`, `.java`, `.cpp`, `.c`).

### Single-line Example
```javascript
/** blog: atomic Redis-based locks resolved concurrency issue in checkout flow */
```

### Multi-line Example
```javascript
/** blog:
 * learned that JWT refresh rotation needs to be atomic —
 * if you issue a new token but the old one isn't invalidated yet,
 * there's a replay window. Redis SETNX fixes this.
 */
```

### Formatting Code Inside Logs
You can wrap words in backticks (e.g., \`SETNX\` or \`JWT\`) to automatically format them as code blocks in the web UI.

---

## 🛠️ Configuration

Adding a project is as simple as editing `src/config.js`:

```javascript
export const PROJECTS = [
  { 
    name: "JWT Redis Auth API", 
    repo: "saltyip/jwt-redis-auth-api", 
    description: "Secure REST API with refresh token rotation, Redis caching, rate limiting" 
  },
  { 
    name: "Email Queue Service", 
    repo: "saltyip/email-queue-service", 
    description: "BullMQ job queue with Gmail SMTP, retry logic, exponential backoff" 
  }
]
```

---

## ⚡ Setup & Development

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Environment Variables (Optional but Recommended)
GitHub API rate-limits unauthenticated requests to 60 requests per hour. To avoid this limit, create a `.env` file in the root folder with a GitHub Personal Access Token:

```bash
cp .env.example .env
```

Add your token to `.env`:
```env
VITE_GITHUB_TOKEN=your_github_personal_access_token_here
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 🎨 Design System

- **Background**: Deep black/dark gray `#070708` with a subtle teal radial spotlight glow.
- **Panels**: Semi-transparent dark cards (`rgba(255,255,255,0.02)`) with a blur filter and a light border.
- **Typography**: `Inter` for body/description text and `JetBrains Mono` for file headings.
- **Aesthetic**: Micro-animations, status dots, and a collapsing navigation system for mobile devices.
