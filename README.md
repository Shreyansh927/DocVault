
# 🚀 DocVault
> **AI-Powered Secure Document Management Platform**

DocVault is a full-stack AI SaaS platform that combines secure cloud storage, Retrieval-Augmented Generation (RAG), semantic search, OCR, offline-first architecture, collaboration, and natural-language automation into one intelligent document workspace.

---

# ✨ Features

## 🔐 Authentication & Security
- JWT Authentication
- Access + Refresh Token architecture
- HTTP-only Secure Cookies
- Refresh Token Rotation
- Multi-device session management
- Logout single/all devices
- OTP based password reset
- Google OAuth Login
- bcrypt password hashing
- RBAC
- CORS, Helmet, Rate Limiting
- Protected Routes

![Login](Screenshot%202026-07-12%20144654.png)

![Forgot Password](Screenshot%202026-07-12%20144713.png)

![OTP](Screenshot%202026-07-12%20144749.png)

---

# 📂 Intelligent Document Management

- Folder hierarchy
- Public / Private folders
- Upload/Delete/Restore/Permanent Delete
- Trash Management
- Pagination
- Search
- Google Drive Import
- File Metadata
- Soft Delete

![Folders](Screenshot%202026-07-12%20141742.png)

![Files](Screenshot%202026-07-12%20144921.png)

![Trash](Screenshot%202026-07-12%20145131.png)

![Google Drive](Screenshot%202026-07-12%20145204.png)

---

# 🤖 AI Features

## AI Assistant
Supports natural language commands:

- Create folders
- Delete folders
- Move files
- Rename folders
- Share folders
- Grant permissions
- Revoke permissions
- Summarize documents
- Ask questions from uploaded documents

### AI Automation Flow

User Prompt
→ Gemini Intent Detection
→ LangChain Processing
→ Entity Extraction
→ Backend Validation
→ Database Update
→ Response

Supported examples:

```text
Create a folder named Study
Move DMGT.pdf to Study
Grant Rahul access to Resume folder
Summarize Aadhaar.pdf
Where is my PAN card?
```

![AI Assistant](Screenshot%202026-07-12%20145059.png)

![AI Result](Screenshot%202026-07-12%20145100.png)

---

# 🧠 RAG Pipeline

Upload
→ OCR (Tesseract)
→ Chunking
→ Google Generative AI Embeddings
→ PGVector
→ Semantic Similarity Search
→ Top-K Retrieval
→ Gemini
→ Context-aware Answer

### Technologies
- LangChain
- Google Gemini
- Google Generative AI Embeddings
- PGVector
- Retrieval Augmented Generation (RAG)
- Semantic Search
- Vector Search
- Prompt Engineering

---

# 📄 OCR & Summarization

- OCR using Tesseract.js
- English + Hindi OCR
- Automatic AI summaries
- Metadata generation
- Embedding generation

---

# ⚙️ Background Processing

Heavy tasks execute asynchronously using:

- BullMQ
- Redis
- Background Workers
- Retry Logic
- Exponential Backoff

Pipeline:

Upload
→ Queue
→ Worker
→ OCR
→ Summary
→ Embedding
→ PostgreSQL
→ Ready

---

# 💾 Offline Support

Offline-first experience powered by IndexedDB.

Features:

- Cached metadata
- Cached files
- Offline browsing
- Automatic synchronization
- Queue pending operations
- Instant loading

---

# 👥 Collaboration

- Friend Requests
- Connections
- Folder Sharing
- Public Links
- Permission Management
- Revoke Access
- Notifications

![Users](Screenshot%202026-07-12%20141607.png)

![Notifications](Screenshot%202026-07-12%20142010.png)

![Connections](Screenshot%202026-07-12%20142024.png)

![Access Control](Screenshot%202026-07-12%20142035.png)

---

# 📊 Dashboard

- User Profile
- Active Sessions
- AI Query History
- Session Logout
- Recent Semantic Queries

![Dashboard](Screenshot%202026-07-12%20141945.png)

![AI History](Screenshot%202026-07-09%20015223.png)

---

# ☁️ Google Drive Integration

- OAuth2 Authentication
- Browse Drive
- Import Files
- Upload to Supabase Storage
- Automatic AI Indexing

---

# 🏗 Architecture

Frontend (React + Vite)
↓
Express REST API
↓
Authentication Middleware
↓
BullMQ + Redis
↓
LangChain + Gemini
↓
PostgreSQL + PGVector
↓
Supabase Storage

---

# 🛠 Tech Stack

## Frontend
- React.js
- Vite
- React Router
- Axios
- Axios Interceptors
- CSS3
- Responsive UI
- IndexedDB
- AbortController

## Backend
- Node.js
- Express.js
- JWT
- Cookie Parser
- bcrypt
- Multer
- BullMQ
- Redis
- node-cron
- Express Middleware

## AI
- Google Gemini
- LangChain
- Google Generative AI Embeddings
- RAG
- Semantic Search
- Vector Search
- Prompt Engineering

## Database
- PostgreSQL
- PGVector
- Supabase Database

## Storage
- Supabase Storage
- Google Drive API

## Deployment
- Docker
- Docker Compose
- Render

---

# 🔒 Security

- HTTP-only Cookies
- Refresh Token Rotation
- Access Tokens
- Session Revocation
- Rate Limiting
- Password Hashing
- Input Validation
- Authorization Middleware
- Protected APIs
- Row Level Security (Supabase RLS Policy)

---

# 📈 Future Roadmap

- Voice AI
- MCP Integration
- Multi-Agent AI
- Real-time Collaboration
- WebSocket Notifications (Using supabase realtime)
- Document Versioning
- Enterprise RBAC

---
