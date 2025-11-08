# Blog Platform

A minimal blog web application built with **Express.js**, **EJS templates**, **JWT auth**, and **SQLite**.  
Users can register, log in, and perform full CRUD operations (Create, Read, Update, Delete) on blog posts.

## Features

- **JWT-based Authentication**
  - Secure login and signup flow.
  - Passwords hashed before storage.
- **SQLite Database**
  - Lightweight and persistent local storage.
- **EJS Templates**
  - Server-side rendering for all pages.
- **CRUD for Blog Posts**
  - Create, edit, delete, and view posts.  **User Accounts**
  - Each post is linked to its author.
---

## Tech Stack

| Layer | Technology |
|-------|-------------|
| **Backend** | Node.js + Express |
| **Templating Engine** | EJS |
| **Database** | SQLite (via `better-sqlite3` or `sqlite3`) |
| **Authentication** | JWT (JSON Web Tokens) |
| **Environment Variables** | dotenv |
| **Development** | nodemon |

---
