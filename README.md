# SecureAI (Prototype)

![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white) ![Flask](https://img.shields.io/badge/Flask-000000?logo=flask&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=white) ![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio&logoColor=white)

A prototype of a role-aware enterprise AI assistant. The same question gets a different answer depending on the user's role, every interaction is logged for audit, and users can also message each other in real time.

## Features

- **Role-based response filtering:** a governance engine applies RBAC and need-to-read rules. Sensitive topics (salaries, credentials, personal data) are blocked for interns and masked for HR (emails, phone numbers, SSNs and card numbers are redacted).
- **AI chat** backed by OpenAI or Google Gemini
- **Audit logging** of every AI interaction, with an admin dashboard and charts
- **Real-time private messaging** over Socket.IO
- JWT authentication with login and registration

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Flask, Flask-SocketIO, Flask-SQLAlchemy, Flask-JWT-Extended, SQLite |
| AI | OpenAI, Google Gemini, scikit-learn |
| Frontend | React, Vite, React Router, Tailwind CSS, Framer Motion, Recharts, Socket.IO client |

## Getting started

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py            # runs on http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev
```

Create a `.env` file in `backend/` with `AI_PROVIDER` (`openai` or `gemini`) and the matching `OPENAI_API_KEY` or `GEMINI_API_KEY`.

## Environment variables

Set these in `backend/.env`. Replace the development placeholders outside local use.

| Variable | Purpose | Default |
|---|---|---|
| `AI_PROVIDER` | `openai` or `gemini` | `gemini` |
| `OPENAI_API_KEY / GEMINI_API_KEY` | Key for the chosen provider | - |
| `SECRET_KEY` | Flask secret key | dev placeholder |
| `JWT_SECRET_KEY` | JWT signing secret | dev placeholder |

## Project structure

```
backend/app/
  models/       User, Message and AuditLog models
  routes/       auth, chat, logs, messages, users, socket events
  services/     ai_service.py (LLM calls), governance.py (role-based filtering)
frontend/src/
  pages/        Login, Register, Chat, Private Chat, Dashboard
  context/      Auth context
  utils/        API and socket clients
```

A later version of this project is in [SentinelSystem-using-RAG](https://github.com/shridhar618/SentinelSystem-using-RAG).
