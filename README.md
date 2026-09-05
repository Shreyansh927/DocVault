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

Application APIs & authorization

Asynchronous document processing

AI / RAG workflows

Vector retrieval

External tool execution

Cloud storage & database

Containerized infrastructure

✨ What Makes DocVault Different?

Capability

Implementation

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

JWT access and refresh tokens

HTTP-only secure cookies

Refresh-token rotation

Google OAuth

OTP-based password reset

bcrypt password hashing

Session Management

Multi-device sessions

Single-device logout

Logout from all devices

Session revocation

Application Security

RBAC

Protected routes

Authorization middleware

Input validation

CORS

Helmet

Rate limiting

Database Security

Supabase Row Level Security (RLS)

Permission checks

Protected data access

📂 Document Management

DocVault provides a complete document lifecycle.

Organization

Hierarchical folders

Public and private folders

File metadata

Search

Pagination

Lifecycle

Upload

Soft delete

Trash

Restore

Permanent deletion

Sharing

Folder sharing

Public links

Permission management

Access revocation

🤖 AI Assistant

Users interact with DocVault using natural language instead of navigating every operation manually.

Supported Actions

Create folders

Rename folders

Delete folders

Move files

Share folders

Grant permissions

Revoke permissions

Search documents

Summarize documents

Ask questions about uploaded documents

Example

Create a folder named Study

Move DMGT.pdf to Study

Grant Rahul access to Resume folder

Summarize Aadhaar.pdf

Where is my PAN card?

🧠 Agentic AI

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

Tool Group

Operations

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

Google Gemini

Google Generative AI Embeddings

LangChain

LangGraph

PostgreSQL + pgvector

Semantic Search

Vector Search

Re-ranking

Prompt Engineering

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

Traceability

Answer verification

Grounding

Transparency

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

Tesseract.js

English OCR

Hindi OCR

Text extraction

AI Processing

Automatic summaries

Metadata generation

Text chunking

Embedding generation

Search indexing

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

BullMQ

Redis

Dedicated workers

Retry handling

Exponential backoff

Asynchronous job execution

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

Answer Relevance

Context Relevance

Faithfulness / Groundedness

Retrieval Quality

Overall Response Quality

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

LLM calls

LangGraph executions

Retrieval steps

Tool execution

Prompts and responses

Latency

Errors

End-to-end AI traces

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

Friend requests

User connections

Folder sharing

Public links

Permission management

Access revocation

Notifications

Users can receive notifications for:

Folder sharing

Permission changes

Connection requests

Access revocation

Collaboration events

📊 Dashboard

The dashboard provides account and AI activity visibility.

User profile

Active sessions

Session management

AI query history

Recent semantic queries

Logout management

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

Service

Purpose

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

Backend containerization

Worker containerization

Local development

Multi-container environments

Environment isolation

Reproducible builds

Docker Compose orchestration

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

Reverse proxying

Request routing

Load balancing

Backend abstraction

Traffic distribution

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

Layer

Technologies

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

Gmail MCP integration

Human-in-the-Loop (HITL)

Multi-agent AI

Advanced agent memory

Additional MCP integrations

Real-time collaboration

WebSocket-based features

Document versioning

Enterprise RBAC

Voice AI

🎯 Engineering Focus

DocVault brings together several areas of modern software engineering and applied AI:

Backend Engineering

REST API architecture

Authentication and authorization

PostgreSQL data modeling

Asynchronous job processing

Redis-backed workers

AI Engineering

RAG

Semantic search

Vector databases

Re-ranking

Agentic workflows

MCP

RAG evaluation

LLM observability

Infrastructure

Docker

Docker Compose

Nginx

Reverse proxying

Load balancing

Horizontal scaling architecture

Managed cloud services

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

Node.js

npm

Docker

Docker Compose

Supabase project

Redis

Google Gemini / Generative AI credentials

Tavily MCP configuration

Installation

git clone https://github.com/Shreyansh927/DocVault.git
cd DocVault
npm install

Configure the required environment variables for:

Supabase

PostgreSQL

Redis

Gemini

Tavily MCP

Authentication

Application configuration

Docker

docker compose up --build

🔒 Production Security

Before deployment:

Keep secrets outside the repository

Use environment variables or a secret manager

Enable HTTPS

Use secure HTTP-only cookies

Configure Supabase RLS policies

Protect database and Redis credentials

Apply appropriate rate limits

Use least-privilege permissions

Keep dependencies updated

Separate development and production configuration

👨‍💻 Author

Shreyansh Dixit

B.Tech — Computer Science & Engineering

<div align="center">

⭐ DocVault

A secure document platform evolving into an intelligent, agentic knowledge workspace.

</div>
