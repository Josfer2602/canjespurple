# 🏛️ SaaS BTL Redemption Platform: Architecture & Progress

This document serves as the master blueprint and progress tracker for the Multi-tenant BTL Redemption SaaS project.

---

## 💾 Database Schema (PostgreSQL + PostGIS + JSONB)

### Extensions
- `postgis`: For geographic data (Visit points, Redemption locations).
- `pgcrypto` or `uuid-ossp`: For UUID generation.

### Tables

#### 1. `projects` (Multi-tenant isolation)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Project unique identifier. |
| `name` | VARCHAR | Internal project name. |
| `client_name` | VARCHAR | Customer brand name. |
| `logo_url` | TEXT | Drive URL for the brand logo. |
| `config` | JSONB | Settings: `photo_slots`, `extra_fields_def`, `unique_ticket_validation` (ON/OFF). |
| `status` | ENUM | ACTIVE, ARCHIVED, DRAFT. |

#### 2. `users` (RBAC)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | User unique identifier. |
| `project_id` | UUID (FK) | For project-specific staff. Null for SuperAdmins. |
| `email` | VARCHAR | Unique login. |
| `role` | ENUM | ADMIN, SUPERVISOR, STAFF (Canjista). |
| `full_name` | VARCHAR | Display name. |

#### 3. `points` (Visit Locations)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique point ID. |
| `project_id` | UUID (FK) | Filter by project. |
| `name` | VARCHAR | Point name (e.g., "Mercado Central"). |
| `location` | GEOGRAPHY | PostGIS Point (Lat/Long). |

#### 4. `redemption_rules` (Motor de Lineamientos)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Rule unique identifier. |
| `project_id` | UUID (FK) | Filter by project. |
| `min_purchase` | NUMERIC | Minimum buy range. |
| `max_purchase` | NUMERIC | Maximum buy range. |
| `reward_name` | VARCHAR | Name of the prize to give. |
| `combo_products`| JSONB | Allowed products list for this rule. |

#### 5. `inventory` (Stock Management)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `user_id` | UUID (FK) | Stock assigned to a specific Staff/Supervisor. |
| `item_name` | VARCHAR | Name of the prize/material. |
| `stock` | INTEGER | Current quantity. |
| `threshold` | INTEGER | For warnings (Green/Orange/Red). |

#### 6. `visits` (Start/End Session)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `user_id` | UUID (FK) | |
| `point_id` | UUID (FK) | |
| `start_time` | TIMESTAMPTZ | Automatic. |
| `end_time` | TIMESTAMPTZ | Manual "Cerrar Visita". |
| `facade_photo` | TEXT | Drive URL. |
| `location` | GEOGRAPHY | PostGIS Point. |

#### 7. `redemptions` (Audit & Analytics)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | |
| `visit_id` | UUID (FK) | Link to active visit. |
| `dni` | VARCHAR | Customer identifier. |
| `amount` | NUMERIC | Ticket value. |
| `ticket_no` | VARCHAR | For unique validation (if configured). |
| `reward` | VARCHAR | Prize given. |
| `extra_data` | JSONB | Map of dynamic fields. |
| `photos` | JSONB | List of Drive URLs. |
| `location` | GEOGRAPHY | PostGIS Point at moment of redemption. |

---

## 🏗️ Project Structure (Monorepo-style or Split)

- `/backend`: Node.js (Express/NestJS) + Typescript.
- `/frontend`: React + Vite + Tailwind + Shadcn.
- `/docs`: Additional documentation.

### 🧩 Key React Components
- `ImageProcessor`: Canvas logic to add metadata margin (Lat/Long/Date/DNI).
- `DynamicForm`: Renders inputs based on Project JSONB config.
- `HeatmapChart`: Matrix/Quadrícula for density analysis (Hours vs Weekdays).
- `AuditTable`: Paged table with Drive preview links and Excel export.
- `StockCard`: Visual indicator for inventory health (KPIs).

---

## 🚦 Progress Checklist

### 🏗️ Foundation
- [x] Backend Initialization (Express + Typescript).
- [x] Project Structure (backend/frontend).
- [x] Design System Tokens & Tailwind Config.
- [x] Database Connection (Supabase + Prisma).
- [x] PostgreSQL + PostGIS Schema Design & Seed.
- [x] Initial JSONB Dynamic Layout support.
- [x] Authentication System (JWT + Role Based Auth) - *Backend Ready*.
- [x] Google Drive API Integration (Service Account configured).
- [x] Google Drive Folder ID setup & Testing.
- [x] Canvas Image Processing (Frontend with Metadata Overlay).

### 📱 Staff App (Mobile First)
- [x] Login & Project Selection (Mocked for initial structure).
- [x] **Home View**: KPI Cards + Stock List (Color coded).
- [x] **Layout**: Mobile-first Header/Bottom Nav framework.
- [ ] **Visits**: Form Alta (GPS + Photo + Point Selector).
- [ ] **Redemption Flow**: 
- [ ] **History**: Recent redemptions list.

### 📊 Admin/Desktop Dashboard
- [ ] **Project Management**: CRUD + Dynamic Field Setup (JSONB config).
- [ ] **Dashboard Stats**:
    - [ ] KPI Cards (Total, Unique DNI, Stock %).
    - [ ] Trend Line Chart (Redemptions per day).
    - [ ] Heatmap Matrix (Hourly intensity).
- [ ] **Interactive Map**: Leaflet integration (Pines + Heatmap Layer).
- [ ] **Auditory**: Paged List with Export to Excel.

### 🛡️ Anti-Fraud & Logic
- [ ] Historical DNI checking.
- [ ] Ticket uniqueness enforcement (Project-level config).
- [ ] Offline-aware Sync (PWA strategy).

---

## 🌐 API Endpoints (Planned)

### `POST /api/auth/login`
- Returns: `token`, `user`, `project_config`.

### `POST /api/visits/start`
- Payload: `point_id`, `facade_photo`, `coordinates`.

### `POST /api/redemptions`
- Payload: `dni`, `amount`, `ticket_no`, `visit_id`, `extra_data`, `photos[]`.

### `GET /api/dashboard/heatmap`
- Returns: Matrix data for Hour/Day activity.

---

## 🧬 Environment Variables (.env.example)

```bash
DATABASE_URL="postgres://user:pass@localhost:5432/btl_db"
JWT_SECRET="super-secret-key"
GOOGLE_DRIVE_KEY_PATH="./service-account.json"
GOOGLE_DRIVE_FOLDER_ID="root_folder_id_here"
PORT=4000
```
