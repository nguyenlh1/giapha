# Gia Phả Dòng Họ - Family Genealogy Management

A bilingual (English + Vietnamese) web application to manage family genealogy, built with Next.js 14, Prisma, MariaDB, and NextAuth.js.

## Project Overview
This project provides a robust solution for tracking clan members, their relationships, and rendering a visual family tree. It includes Role-Based Access Control (RBAC), data import/export via JSON, and modern UI built with TailwindCSS.

## Stack
- Framework: Next.js 14+ (App Router) with TypeScript
- UI/Styling: TailwindCSS
- Database: MariaDB (via Prisma ORM)
- Authentication: NextAuth.js (Auth.js) with Credentials Provider
- Tree Visualization: React Flow + Dagre (auto-layout)
- Internationalization: Native implementation (English & Vietnamese)

## Roles
- `ADMIN`: Full access to create, update, delete, and import/export.
- `EDITOR`: Access to manage members and relationships, and export.
- `VIEWER`: Read-only access to dashboard, members list, and tree view.

## Setup Instructions

### Prerequisites
- Node.js (>= 18)
- MariaDB Server

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Ensure `DATABASE_URL` correctly points to your MariaDB instance.
Example: `mysql://root:password@localhost:3306/giapha`

### 3. Database Setup (Migrations & Seed)
Run the Prisma migrations to create tables, and then seed the database with initial data (~20 persons):

```bash
npx prisma migrate dev --name init
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Seeded Accounts
- Admin: `admin@giapha.vn` / `password123`
- Editor: `editor@giapha.vn` / `password123`
- Viewer: `viewer@giapha.vn` / `password123`

## Features Matrix
- ✅ Bilingual UI (EN/VI) via Next.js Layout
- ✅ NextAuth.js Credentials authentication
- ✅ Dashboard with metrics
- ✅ Persons CRUD + Search + Filter by Generation
- ✅ Relational link management (Parent-Child, Spouse)
- ✅ Auto-layout Interactive Tree View (dagre)
- ✅ Admin JSON Data Import / Export
