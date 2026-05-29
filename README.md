# RepoRadar - Architectural Developer Intelligence Platform

RepoRadar is an enterprise-grade developer profile analyzer, metrics aggregation platform, and social synergy radar. The application dynamically scans and indexes GitHub profiles, processes repository dimensions, parses linguistic compositions, and calculates multi-weighted developer capability vectors. 

All insights are persisted in a production-ready relational database backend (supporting both PostgreSQL/Neon and MySQL dialects) and visualized via a premium, dark-mode tactical dashboard built on brutalist, hyper-functional visual design paradigms.

---

## 🚀 Key Features

*   **Tactical Social Web Synergy Mapping**: Uses dynamic, real-time relational algorithms on the backend to maps follower clusters, technology overlaps, and shared repository footprints on a custom HTML5 canvas canvas, resolving peer clusters automatically.
*   **Dual-Dialect Database Engine**: Dynamic backend database adapter that handles **PostgreSQL (Neon serverless)** and **MySQL** transparently on startup based on the connection string.
*   **Weighted Scoring Vector Model**: Uses multi-layered criteria (Follower Influence, Star Power Ratings, Fork Adaptations, and Profile Completeness Matrix) to calculate dynamic Developer Scores and alphanumeric grades (`S`, `A+`, `A`, `B+`, `B`, `C`).
*   **Modern Editorial UI System**: A premium theme designed around robust typography (`Syne` + `Space Grotesk` fonts), extreme micro-interactions, responsive panel architecture, and high-performance radar visualizations.
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
reporadar/
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
Create a `.env` file in the root directory:
```ini
PORT=5000

# PostgreSQL / Neon (Default recommended):
DATABASE_URL=postgresql://neondb_owner:password@ep-snowflake.us-east-2.aws.neon.tech/neondb?sslmode=require

# MySQL (Alternative):
# DATABASE_URL=mysql://root:password@127.0.0.1:3306/reporadar

# Optional: GitHub PAT to avoid API rate limits:
# GITHUB_TOKEN=github_pat_xxxx
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
