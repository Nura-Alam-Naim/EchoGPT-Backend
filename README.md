# 🚀 EchoGPT Backend REST API

A **production-ready** backend for the [EchoGPT Chrome Extension](https://chromewebstore.google.com/detail/echogpt-multi-ai-chat-sid/negimdcamohmoheiifgecbjgjepkcfhj) built with **NestJS**, **PostgreSQL**, **Prisma ORM**, and **Swagger/OpenAPI**.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Docker Setup](#docker-setup)
- [API Documentation](#api-documentation)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Security](#security)

---

## ✨ Features

- **Authentication** — JWT access/refresh tokens, secure registration & login, password hashing (bcrypt)
- **User Management** — Profile CRUD, password change, account deletion, role-based access (Admin/User)
- **Subscription Management** — Free & Premium plans, daily usage limits, upgrade/downgrade
- **AI Provider Management** — Multi-provider support (OpenAI, Claude, Gemini), encrypted API key storage, health checks
- **Chat API** — Send prompts, receive AI responses, conversation history, provider selection
- **Web Search API** — AI-powered search, search history, suggestions, result caching
- **Admin Panel APIs** — Dashboard stats, user management, subscription overview, usage analytics, request logs, system health
- **Full Swagger Documentation** — Every endpoint documented with examples

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| [NestJS](https://nestjs.com/) | Backend framework (Node.js + TypeScript) |
| [PostgreSQL](https://www.postgresql.org/) | Relational database |
| [Prisma ORM](https://www.prisma.io/) | Database ORM & migrations |
| [Swagger/OpenAPI](https://swagger.io/) | API documentation |
| [JWT](https://jwt.io/) | Authentication tokens |
| [Passport.js](http://www.passportjs.org/) | Authentication middleware |
| [Docker](https://www.docker.com/) | Containerization |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Password hashing |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Chrome Extension                       │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────┐
│                   NestJS API Layer                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │ Auth │ │Users │ │ Subs │ │  AI  │ │ Chat │ │Search││
│  │Module│ │Module│ │Module│ │Provs │ │Module│ │Module││
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘│
│     └────────┴────────┴────────┴────────┴────────┘     │
│                        Prisma ORM                        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                   PostgreSQL Database                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18
- **PostgreSQL** >= 14 (or Docker)
- **npm** >= 9

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/echogpt-backend.git
cd echogpt-backend

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your database credentials and API keys
```

### Database Setup

**Option A: Using Docker (Recommended)**
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait a few seconds for it to start, then:
npm run db:setup
```

**Option B: Using local PostgreSQL**
```bash
# Create the database
createdb echogpt_db

# Update DATABASE_URL in .env with your connection string

# Run migrations and seed
npm run db:setup
```

### Running the Application

```bash
# Development mode (with hot-reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at: `http://localhost:3000`
Swagger docs available at: `http://localhost:3000/api/docs`

### Default Admin Account
After seeding, you can log in with:
- **Email**: `admin@echogpt.com`
- **Password**: `Admin@123`

---

## 🐳 Docker Setup

Run the entire stack with one command:

```bash
# Build and start everything (PostgreSQL + NestJS API)
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Stop everything
docker-compose down

# Reset (remove volumes)
docker-compose down -v
```

---

## 📚 API Documentation

Interactive Swagger documentation is auto-generated and available at:

```
http://localhost:3000/api/docs
```

From Swagger UI you can:
- Browse all endpoints organized by module
- See request/response schemas
- Try out any endpoint directly
- Authenticate with JWT tokens

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Login with credentials |
| POST | `/api/auth/logout` | Logout (invalidate tokens) |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/verify-email/:token` | Verify email address |

### Users (`/api/users`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/profile` | Get current user profile |
| PATCH | `/api/users/profile` | Update profile |
| PATCH | `/api/users/change-password` | Change password |
| DELETE | `/api/users/account` | Delete account |
| GET | `/api/users/:id` | Get user by ID (Admin) |

### Subscriptions (`/api/subscriptions`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/subscriptions/status` | Get subscription status |
| POST | `/api/subscriptions/upgrade` | Upgrade to Premium |
| POST | `/api/subscriptions/downgrade` | Downgrade to Free |
| GET | `/api/subscriptions/usage` | Get usage statistics |
| GET | `/api/subscriptions/remaining` | Get remaining requests |

### AI Providers (`/api/providers`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/providers` | List all providers |
| GET | `/api/providers/:id` | Get provider details (Admin) |
| POST | `/api/providers` | Add new provider (Admin) |
| PATCH | `/api/providers/:id` | Update provider (Admin) |
| DELETE | `/api/providers/:id` | Delete provider (Admin) |
| PATCH | `/api/providers/:id/toggle` | Enable/disable (Admin) |
| GET | `/api/providers/:id/health` | Health check (Admin) |

### Chat (`/api/chat`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/send` | Send message to AI |
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/conversations/:id` | Get conversation messages |
| POST | `/api/chat/conversations` | Create new conversation |
| DELETE | `/api/chat/conversations/:id` | Delete conversation |
| PATCH | `/api/chat/conversations/:id` | Rename conversation |

### Web Search (`/api/search`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/search` | Perform AI-powered search |
| GET | `/api/search/history` | Get search history |
| GET | `/api/search/recent` | Get recent searches |
| GET | `/api/search/suggestions?q=` | Get search suggestions |
| DELETE | `/api/search/history/:id` | Delete search entry |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | Dashboard statistics |
| GET | `/api/admin/users` | List all users |
| PATCH | `/api/admin/users/:id/role` | Change user role |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/subscriptions` | List subscriptions |
| GET | `/api/admin/usage-analytics` | Usage analytics |
| GET | `/api/admin/request-logs` | Request logs |
| GET | `/api/admin/system-health` | System health |

---

## 🗄️ Database Schema

The application uses a normalized PostgreSQL schema with the following tables:

| Table | Description |
|---|---|
| `roles` | User roles (ADMIN, USER) |
| `users` | User accounts |
| `sessions` | Active sessions with refresh tokens |
| `subscriptions` | User subscription plans |
| `ai_providers` | Configured AI providers |
| `chat_conversations` | Chat conversation threads |
| `chat_messages` | Individual chat messages |
| `web_searches` | Web search history |
| `api_usage_logs` | API request logs |

---

## ⚙️ Environment Variables

See [`.env.example`](.env.example) for all required variables:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_ACCESS_SECRET` | JWT access token secret | Required |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Required |
| `JWT_ACCESS_EXPIRATION` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRATION` | Refresh token TTL | `7d` |
| `ENCRYPTION_KEY` | Key for encrypting API keys | Required |
| `THROTTLE_TTL` | Rate limit window (ms) | `60000` |
| `THROTTLE_LIMIT` | Max requests per window | `100` |

---

## 📁 Project Structure

```
echogpt-backend/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── src/
│   ├── main.ts              # Entry point + Swagger
│   ├── app.module.ts        # Root module
│   ├── common/              # Shared utilities
│   │   ├── decorators/      # Custom decorators
│   │   ├── guards/          # Auth & role guards
│   │   ├── filters/         # Exception filters
│   │   ├── interceptors/    # API logger
│   │   └── utils/           # Encryption utils
│   ├── prisma/              # Database service
│   ├── auth/                # Authentication
│   ├── users/               # User management
│   ├── subscriptions/       # Subscription plans
│   ├── ai-providers/        # AI provider management
│   ├── chat/                # Chat & messaging
│   ├── web-search/          # Web search
│   └── admin/               # Admin panel
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── package.json
```

---

## 🔐 Security

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Access (15m) + Refresh (7d) token rotation
- **API Key Encryption**: AES-256-GCM authenticated encryption
- **Rate Limiting**: 100 requests/minute per IP
- **Input Validation**: class-validator on all DTOs
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security HTTP headers
- **Role-Based Access**: Admin/User permissions per endpoint

---

## 📝 License

This project is licensed under the MIT License.
