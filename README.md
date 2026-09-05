<div align="center">

🚀 DocVault

AI-Powered Secure Document Management & Intelligent Knowledge Platform

Secure documents. Search with meaning. Ask questions. Automate actions. Extend knowledge with the web.
<p>
  <img src="https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/**PostgreSQL**-**pgvector**-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="**PostgreSQL**">
  <img src="https://img.shields.io/badge/**LangGraph**-Agentic%20AI-1C3C3C?style=for-the-badge" alt="**LangGraph**">
  <img src="https://img.shields.io/badge/**Docker**-**Nginx**-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="**Docker**">
  <img src="https://img.shields.io/badge/**Supabase**-Cloud-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="**Supabase**">
</p>
</div>

📌 Overview

DocVault is a full-stack AI SaaS platform for securely storing, organizing, searching, and interacting with documents.
It combines a traditional document-management backend with an AI knowledge layer built around RAG, semantic search, agentic workflows, MCP, evaluation, and observability.
The system is designed with a strong separation between:

<p>• **Application APIs & authorization**</p>
<p>• **Asynchronous document processing**</p>
<p>• **AI / RAG workflows**</p>
<p>• **Vector retrieval**</p>
<p>• **External tool execution**</p>
<p>• **Cloud storage & database**</p>
<p>• **Containerized infrastructure**</p>

✨ What Makes DocVault Different?

CapabilityImplementation



🔐 Secure Document Platform

JWT, refresh-token rotation, OAuth, sessions, RBAC, RLS

🧠 Document Intelligence

OCR, embeddings, semantic search, RAG

🤖 Agentic Automation

LangGraph + application tools

🔎 Advanced Retrieval

pgvector retrieval + re-ranking

🌐 External Knowledge

Tavily MCP

📚 Grounded Answers

Source-aware responses and citations

📊 RAG Evaluation

LLM-as-a-Judge evaluation

📈 AI Observability

LangSmith tracing and monitoring

⚙️ Async Processing

BullMQ + Redis workers

🐳 Infrastructure

Docker + Docker Compose

⚖️ Traffic Management

Nginx reverse proxy + load balancing

☁️ Cloud Services

Supabase PostgreSQL, pgvector, Storage, RLS

🧩 Core Features

🔐 Authentication & Security

DocVault uses a layered authentication and authorization architecture.
Authentication

<p>• **JWT** access and refresh tokens</p>
<p>• HTTP-only secure cookies</p>
<p>• Refresh-token rotation</p>
<p>• Google **OAuth**</p>
<p>• OTP-based password reset</p>
<p>• bcrypt password hashing</p>

Session Management

<p>• Multi-device sessions</p>
<p>• Single-device logout</p>
<p>• Logout from all devices</p>
<p>• Session revocation</p>

Application Security

<p>• **RBAC**</p>
<p>• Protected routes</p>
<p>• **Authorization** middleware</p>
<p>• Input validation</p>
<p>• CORS</p>
<p>• Helmet</p>
<p>• Rate limiting</p>

Database Security

<p>• **Supabase** **Row Level Security (RLS)**</p>
<p>• Permission checks</p>
<p>• Protected data access</p>

📂 Document Management

DocVault provides a complete document lifecycle.
Organization

<p>• Hierarchical folders</p>
<p>• Public and private folders</p>
<p>• File metadata</p>
<p>• Search</p>
<p>• Pagination</p>

Lifecycle

<p>• Upload</p>
<p>• Soft delete</p>
<p>• Trash</p>
<p>• Restore</p>
<p>• Permanent deletion</p>

Sharing

<p>• Folder sharing</p>
<p>• Public links</p>
<p>• Permission management</p>
<p>• Access revocation</p>

🤖 AI Assistant

Users interact with DocVault using natural language instead of navigating every operation manually.

Supported Actions

<p>• Create folders</p>
<p>• Rename folders</p>
<p>• Delete folders</p>
<p>• Move files</p>
<p>• Share folders</p>
<p>• Grant permissions</p>
<p>• Revoke permissions</p>
<p>• Search documents</p>
<p>• Summarize documents</p>
<p>• Ask questions about uploaded documents</p>

Example

Create a folder named Study

Move DMGT.pdf to Study

Grant Rahul access to Resume folder

Summarize Aadhaar.pdf

Where is my PAN card?

🧠 Agentic AI with LangGraph

The AI assistant is orchestrated using LangGraph.
Instead of allowing the LLM to directly modify application data, DocVault uses controlled tools and backend validation.

                    User Request
                         │
                         ▼
                  LangGraph Agent
                         │
                         ▼
                Task Understanding
                         │
                         ▼
                  Entity Extraction
                         │
                         ▼
                   Tool Selection
                         │
                         ▼
                Backend Tool Layer
                         │
                         ▼
              Validation & Authorization
                         │
                         ▼
             Database / File Operation
                         │
                         ▼
                   Final Response

Tool Layer

Tool GroupOperations



Document Tools

Search, summarize, move, delete, restore

Folder Tools

Create, rename, delete, move

Permission Tools

Grant, revoke, manage sharing

This keeps LLM reasoning separate from business logic and authorization.

🧠 Retrieval-Augmented Generation

DocVault uses a multi-stage RAG pipeline to answer questions from private documents.

Document Indexing

Upload
  ↓
Queue
  ↓
OCR / Text Extraction
  ↓
Chunking
  ↓
Embedding Generation
  ↓
PostgreSQL + pgvector
  ↓
Indexed Document

Query Processing

User Question
      ↓
Query Processing
      ↓
Embedding Generation
      ↓
pgvector Retrieval
      ↓
Top-K Candidates
      ↓
Re-ranking
      ↓
Context Construction
      ↓
Gemini
      ↓
Grounded Answer
      ↓
Source Citations

RAG Stack

<p>• **Google Gemini**</p>
<p>• **Google Generative AI Embeddings**</p>
<p>• **LangChain**</p>
<p>• **LangGraph**</p>
<p>• **PostgreSQL + pgvector**</p>
<p>• **Semantic Search**</p>
<p>• **Vector Search**</p>
<p>• **Re-ranking**</p>
<p>• **Prompt Engineering**</p>

🔎 Semantic Search & Re-ranking

Documents are represented using vector embeddings so users can search by meaning rather than exact wording.

Natural-Language Query
        ↓
Query Embedding
        ↓
Vector Similarity Search
        ↓
Top-K Candidate Chunks
        ↓
Re-ranking
        ↓
Relevant Context

For example:

"Find my documents related to machine learning projects"

can retrieve conceptually relevant documents even when the exact phrase does not appear in the document.

📚 Grounded Answers & Source Citations

DocVault associates document-based answers with the retrieved source documents or chunks used to construct the response.

Question
   ↓
Retrieve
   ↓
Re-rank
   ↓
Build Context
   ↓
Generate
   ↓
Answer + Sources

This improves:

<p>• **Traceability**</p>
<p>• **Answer verification**</p>
<p>• **Grounding**</p>
<p>• **Transparency**</p>

🌐 Tavily MCP

DocVault integrates Tavily through the Model Context Protocol (MCP) to extend the AI assistant beyond the user's private document collection.
The agent can combine private document knowledge with external web information.

                         User Query
                              │
                              ▼
                       LangGraph Agent
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ▼                         ▼
          Private Knowledge          External Knowledge
                 │                         │
                 ▼                         ▼
             DocVault RAG              Tavily MCP
                 │                         │
                 └────────────┬────────────┘
                              │
                              ▼
                     Context Assembly
                              │
                              ▼
                           Gemini
                              │
                              ▼
                    Grounded Response
                              │
                              ▼
                         Citations

MCP Flow

LangGraph Agent
      ↓
MCP Client
      ↓
Tavily MCP
      ↓
Web Search
      ↓
External Sources
      ↓
Agent Context

📄 OCR & Document Intelligence

Uploaded documents are processed automatically in the background.

OCR

<p>• **Tesseract.js**</p>
<p>• English **OCR**</p>
<p>• Hindi **OCR**</p>
<p>• Text extraction</p>

AI Processing

<p>• Automatic summaries</p>
<p>• Metadata generation</p>
<p>• Text chunking</p>
<p>• Embedding generation</p>
<p>• Search indexing</p>

⚙️ Asynchronous Processing

Heavy document operations are moved out of the synchronous API request path.

                Upload
                  ↓
             Express API
                  ↓
             BullMQ Queue
                  ↓
                Redis
                  ↓
           Background Worker
                  ↓
        ┌─────────┼─────────┐
        ↓         ↓         ↓
       OCR     Summary   Embeddings
        │         │         │
        └─────────┼─────────┘
                  ↓
          PostgreSQL + pgvector
                  ↓
              Ready

Reliability

<p>• **BullMQ**</p>
<p>• **Redis**</p>
<p>• Dedicated workers</p>
<p>• Retry handling</p>
<p>• Exponential backoff</p>
<p>• Asynchronous job execution</p>

📊 RAG Evaluation

DocVault includes an evaluation workflow based on LLM-as-a-Judge to assess the quality of RAG responses.

User Query
    ↓
RAG Retrieval
    ↓
Context Construction
    ↓
LLM Response
    ↓
LLM-as-a-Judge
    ↓
Quality Evaluation
    ↓
Evaluation Results

Evaluation Dimensions

<p>• **Answer Relevance**</p>
<p>• **Context Relevance**</p>
<p>• **Faithfulness / Groundedness**</p>
<p>• **Retrieval Quality**</p>
<p>• **Overall Response Quality**</p>

Improvement Loop

Retrieve
   ↓
Generate
   ↓
Evaluate
   ↓
Identify Weakness
   ↓
Improve Retrieval / Prompt / Context
   ↓
Evaluate Again

📈 LangSmith Observability

LangSmith provides tracing and observability across the AI pipeline.
It helps inspect:

<p>• LLM calls</p>
<p>• **LangGraph** executions</p>
<p>• Retrieval steps</p>
<p>• Tool execution</p>
<p>• Prompts and responses</p>
<p>• Latency</p>
<p>• Errors</p>
<p>• End-to-end AI traces</p>

User Request
      ↓
LangGraph / LangChain
      ↓
Retrieval + Tools + LLM
      ↓
LangSmith
      ↓
Trace / Debug / Monitor

👥 Collaboration & Notifications

DocVault supports controlled document collaboration.

Collaboration

<p>• Friend requests</p>
<p>• User connections</p>
<p>• Folder sharing</p>
<p>• Public links</p>
<p>• Permission management</p>
<p>• Access revocation</p>

Notifications

Users can receive notifications for:

<p>• Folder sharing</p>
<p>• Permission changes</p>
<p>• Connection requests</p>
<p>• Access revocation</p>
<p>• Collaboration events</p>

📊 Dashboard

The dashboard provides account and AI activity visibility.

<p>• User profile</p>
<p>• Active sessions</p>
<p>• Session management</p>
<p>• AI query history</p>
<p>• Recent semantic queries</p>
<p>• Logout management</p>

🏗️ System Architecture

                            ┌─────────────────┐
                            │    React + Vite │
                            │    Frontend     │
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │      Nginx      │
                            │ Reverse Proxy + │
                            │ Load Balancer   │
                            └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              Backend 1         Backend 2         Backend N
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ Node.js/Express │
                            │    REST API     │
                            └───────┬─────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
       Authentication         BullMQ + Redis       AI Workflows
                                    │                     │
                                    ▼               LangChain /
                              Background             LangGraph
                               Workers                  │
                                                        ▼
                                                Gemini / MCP
              │
              └─────────────────────┬─────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ PostgreSQL + pgvector│
                         └──────────┬───────────┘
                                    │
                                    ▼
                           ┌──────────────────┐
                           │ Supabase Storage │
                           └──────────────────┘

☁️ Cloud Infrastructure

DocVault uses Supabase for managed cloud persistence and storage.

ServicePurpose



PostgreSQL

Application data and relational storage

pgvector

Embeddings and vector similarity search

Supabase Storage

Cloud document/file storage

Supabase RLS

Database-level access control

Storage Flow

Client
  ↓
DocVault API
  ↓
Supabase Storage

Database Flow

Application
     ↓
PostgreSQL
     ├── Relational Data
     └── pgvector
           ↓
      Semantic Retrieval

🐳 Docker & Containerization

Docker is used throughout the development and deployment architecture.

Docker Responsibilities

<p>• Backend containerization</p>
<p>• Worker containerization</p>
<p>• Local development</p>
<p>• Multi-container environments</p>
<p>• Environment isolation</p>
<p>• Reproducible builds</p>
<p>• **Docker Compose** orchestration</p>

Container Layout

Docker Compose
│
├── Backend Container(s)
├── Worker
├── Redis
└── Nginx

Multiple backend containers can run behind Nginx to support a horizontal scaling architecture.

This represents multi-container horizontal scaling and load distribution, not managed production auto-scaling.

⚖️ Nginx Reverse Proxy & Load Balancing

Nginx provides the public entry point to the containerized backend.

Client
  ↓
Nginx
  ↓
Load Balancer
  ↓
┌───────────────┬───────────────┐
↓               ↓               ↓
Backend 1       Backend 2       Backend N

Responsibilities

<p>• **Reverse proxying**</p>
<p>• **Request routing**</p>
<p>• **Load balancing**</p>
<p>• **Backend abstraction**</p>
<p>• **Traffic distribution**</p>

🔄 End-to-End Workflows

Document Processing

User Upload
    ↓
Express API
    ↓
Validation
    ↓
Supabase Storage
    ↓
BullMQ
    ↓
Redis
    ↓
Worker
    ↓
OCR
    ↓
AI Summary
    ↓
Chunking
    ↓
Embeddings
    ↓
PostgreSQL + pgvector
    ↓
Indexed Document

RAG Query

User Question
    ↓
LangGraph
    ↓
Query Processing
    ↓
Embedding
    ↓
pgvector
    ↓
Top-K Retrieval
    ↓
Re-ranking
    ↓
Context
    ↓
Gemini
    ↓
Grounded Answer
    ↓
Citations

Private + External Knowledge

                 User Query
                      ↓
               LangGraph Agent
                      ↓
              ┌───────┴───────┐
              ↓               ↓
           DocVault         Tavily
              RAG             MCP
              ↓               ↓
         Private Context  Web Context
              └───────┬───────┘
                      ↓
               Context Assembly
                      ↓
                    Gemini
                      ↓
              Grounded Response
                      ↓
                  Citations

🛠️ Technology Stack

LayerTechnologies



Frontend

React.js, Vite, React Router, Axios, CSS3

Backend

Node.js, Express.js, REST APIs, JWT, bcrypt, Multer

Async Processing

BullMQ, Redis, Background Workers, node-cron

AI / LLM

Google Gemini, LangChain, LangGraph

Embeddings

Google Generative AI Embeddings

RAG

pgvector, Semantic Search, Vector Search, Re-ranking

Evaluation

LLM-as-a-Judge, RAG Evaluation

Observability

LangSmith

MCP

Model Context Protocol, Tavily MCP

OCR

Tesseract.js

Database

PostgreSQL, pgvector, Supabase

Storage

Supabase Storage

Infrastructure

Docker, Docker Compose, Nginx

Deployment

Render, Supabase

🧱 Architecture Principles

Separation of Concerns

API handling, business logic, AI workflows, background jobs, storage, and persistence are separated into distinct layers.

Asynchronous by Design

Expensive OCR and AI processing runs through background workers instead of blocking API requests.

Controlled AI Execution

The LLM selects tools, while backend services remain responsible for validation, authorization, and data mutation.

Grounded Generation

RAG retrieves relevant context before the LLM generates a document-based answer.

Tool-Based External Knowledge

Tavily MCP provides external web capabilities through a standardized tool interface.

Evaluation-Driven AI

LLM-as-a-Judge evaluation provides feedback on RAG quality.

Observable AI Workflows

LangSmith provides traces for debugging and monitoring AI execution.

Defense in Depth

Security is enforced across authentication, authorization, middleware, application logic, and database-level RLS.

Containerized Infrastructure

Docker provides reproducible environments and supports multi-container backend deployments.

📁 Project Structure

DocVault/
│
├── client/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── services/
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── models/
│   ├── tools/
│   ├── agents/
│   ├── workers/
│   └── utils/
│
├── nginx/
├── docker-compose.yml
└── README.md

🗺️ Roadmap

The following capabilities are planned and are not currently presented as implemented:

<p>• Gmail **MCP** integration</p>
<p>• Human-in-the-Loop (HITL)</p>
<p>• Multi-agent AI</p>
<p>• Advanced agent memory</p>
<p>• Additional **MCP** integrations</p>
<p>• Real-time collaboration</p>
<p>• WebSocket-based features</p>
<p>• Document versioning</p>
<p>• Enterprise **RBAC**</p>
<p>• Voice AI</p>

🎯 Engineering Focus

DocVault brings together several areas of modern software engineering and applied AI:
Backend Engineering

<p>• REST API architecture</p>
<p>• **Authentication** and authorization</p>
<p>• **PostgreSQL** data modeling</p>
<p>• Asynchronous job processing</p>
<p>• **Redis**-backed workers</p>

AI Engineering

<p>• **RAG**</p>
<p>• Semantic search</p>
<p>• Vector databases</p>
<p>• **Re-ranking**</p>
<p>• Agentic workflows</p>
<p>• **MCP**</p>
<p>• **RAG** evaluation</p>
<p>• LLM observability</p>

Infrastructure

<p>• **Docker**</p>
<p>• **Docker Compose**</p>
<p>• **Nginx**</p>
<p>• Reverse proxying</p>
<p>• Load balancing</p>
<p>• Horizontal scaling architecture</p>
<p>• Managed cloud services</p>

📸 Screenshots

<details>
<summary><strong>**Authentication**</strong></summary>

Login

Forgot Password

OTP Verification

</details>
<details>
<summary><strong>Document Management</strong></summary>

Folders

Files

Trash

</details>
<details>
<summary><strong>AI Assistant</strong></summary>

AI Assistant

AI Result

</details>
<details>
<summary><strong>Collaboration & Dashboard</strong></summary>

Users

Notifications

Connections

Access Control

Dashboard

AI History

</details>

🚀 Getting Started

Prerequisites

<p>• Node.js</p>
<p>• npm</p>
<p>• **Docker**</p>
<p>• **Docker Compose**</p>
<p>• **Supabase** project</p>
<p>• **Redis**</p>
<p>• **Google Gemini** / Generative AI credentials</p>
<p>• **Tavily MCP** configuration</p>

Installation

git clone https://github.com/Shreyansh927/DocVault.git
cd DocVault
npm install

Configure the required environment variables for:

<p>• **Supabase**</p>
<p>• **PostgreSQL**</p>
<p>• **Redis**</p>
<p>• Gemini</p>
<p>• **Tavily MCP**</p>
<p>• **Authentication**</p>
<p>• Application configuration</p>

Docker

docker compose up --build

🔒 Production Security

Before deployment:

<p>• Keep secrets outside the repository</p>
<p>• Use environment variables or a secret manager</p>
<p>• Enable HTTPS</p>
<p>• Use secure HTTP-only cookies</p>
<p>• Configure **Supabase RLS** policies</p>
<p>• Protect database and **Redis** credentials</p>
<p>• Apply appropriate rate limits</p>
<p>• Use least-privilege permissions</p>
<p>• Keep dependencies updated</p>
<p>• Separate development and production configuration</p>

👨‍💻 Author

Shreyansh Dixit
B.Tech — Computer Science & Engineering

<div align="center">

⭐ DocVault

A secure document platform evolving into an intelligent, agentic knowledge workspace.
</div>
