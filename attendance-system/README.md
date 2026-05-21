# Attendance Management System

## Overview
Full-stack system using React, Node.js/Express, MySQL for QR-based attendance tracking with Student/Teacher/Admin roles.

## Architecture
```
attendance-system/
├── backend/          # Express + MySQL API
├── frontend/         # React Vite app
├── database/         # Schema & migrations
└── docs/            # Diagrams, setup
```

## Quick Start
1. Backend: `cd backend && npm install && npm run dev`
2. Database: Import `database/schema.sql`
3. Frontend: `cd frontend && npm install && npm run dev`

## Features
- QR scanning via keyboard input
- Role-based auth (JWT)
- Class/subject management
- Attendance export CSV

