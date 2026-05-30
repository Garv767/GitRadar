# GitRadar - Architectural Developer Intelligence Platform

GitRadar is an enterprise-grade developer profile analyzer, metrics aggregation platform, and social synergy radar. The application dynamically scans and indexes GitHub profiles, processes repository dimensions, parses linguistic compositions, and calculates multi-weighted developer capability vectors. 

All insights are persisted in a production-ready relational database backend (supporting both PostgreSQL/Neon and MySQL dialects) and visualized via a premium, dark-mode tactical dashboard built on brutalist, hyper-functional visual design paradigms.

---

## 🚀 Key Features

*   **Tactical Social Web Synergy Mapping**: Uses dynamic relational algorithms on the backend to map concrete clusters. Peer connections are only formed on **strict rules**: ≥1 shared repository name in the database OR a direct GitHub follower/following relationship. Visualized on a custom HTML5 canvas.
*   **Third-Party Activity Integrations**: Embeds real-time GitHub Contribution Heatmaps (via `ghchart.rshah.org`) and detailed statistical breakdowns (via `github-profile-summary-cards`) seamlessly into the dark-mode dashboard.
*   **Dual-Dialect Database Engine**: Dynamic backend database adapter that handles **PostgreSQL (Neon serverless)** and **MySQL** transparently on startup based on the connection string.
*   **Weighted Scoring Vector Model**: Uses multi-layered criteria (Follower Influence, Star Power Ratings, Fork Adaptations, and Profile Completeness Matrix) to calculate dynamic Developer Scores and alphanumeric grades (`S`, `A+`, `A`, `B+`, `B`, `C`).
*   **Modern Editorial UI System**: A premium theme designed around robust typography (`Syne` + `Space Grotesk` fonts), responsive flex layouts, and high-performance tactical visualizations.
*   **Side-by-Side Profile Comparison Matrix**: Enables dynamic structural comparisons of any two analyzed profiles in a responsive HUD popup, detailing relative technical synergy.

---

## 🛠️ Tech Stack & Design

*   **Server Logic**: Node.js / Express / Axios
*   **Relational Engine**: Dynamic Adapter (`mysql2` / `pg`) with automated schema migrations.
*   **Interactive Graphics**: Chart.js (Interactive Charts) & HTML5 Canvas API (Vector Social Graphs).
*   **Styling**: Modern, responsive CSS3 using architectural grid layouts, customized utility tags, and CSS tooltips.

---

## 📂 System Architecture

```
gitradar/
├── public/                 # Production-Grade Single Page App
│   ├── index.html          # Structural UI shell with custom tooltips
│   ├── style.css           # Premium CSS styling system (Editorial layout)
│   └── app.js              # State Controller, Canvas renderer & API integration
├── .env                    # Environment configuration
├── db.js                   # Dual-Dialect database router
├── package.json            # Deployment scripts and dependencies
├── schema.sql              # Clean Schema definition
└── server.js               # Express API and core calculation algorithms
```

---

## ⚙️ Installation & Configuration

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (`.env`)
Copy [.env.example](https://github.com/Garv767/GitRadar/blob/main/.env.example) to `.env` in the root directory and configure the variables:
```ini
PORT=5000

# PostgreSQL / Neon (Default recommended):
DATABASE_URL=postgresql://neondb_owner:password@ep-snowflake.us-east-2.aws.neon.tech/neondb?sslmode=require

# MySQL (Alternative):
# DATABASE_URL=mysql://root:password@127.0.0.1:3306/gitradar

# Optional: GitHub PAT to avoid API rate limits:
# GITHUB_TOKEN=github_pat_xxxx

# GitHub OAuth credentials (required for user sign-in):
# GITHUB_CLIENT_ID=your_github_client_id
# GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 3. Run the Platform
```bash
npm start
```
The application will boot and initialize the database schema automatically. Point your browser to `http://localhost:5000` to interact with the dashboard.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/analyze/:username` | Fetches, computes, saves, and returns the full profile intelligence payload. |
| `GET` | `/api/profiles` | Lists all analyzed profiles ordered by Developer Score. |
| `GET` | `/api/profiles/:username` | Fetches saved statistics, repository metadata, languages, and calculated synergies. |
| `DELETE` | `/api/profiles/:username` | Removes profile entries and cascaded metadata from the database. |

---

## 🧬 Dynamic Grading Vector Logic

Developer grades are categorized across five progressive bands:
*   **S-Grade** (Score $\ge$ 1000): Elite capability, highly influential open-source footprint.
*   **A+/A-Grade** (Score 250 - 999): High contribution frequency, broad language composition.
*   **B+/B-Grade** (Score 50 - 249): Regular open-source repository usage, stable follower reach.
*   **C-Grade** (Score < 50): Emerging developer profile.
