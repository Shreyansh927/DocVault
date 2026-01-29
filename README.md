<h1>📁 DocVault — AI-Powered Document Vault</h1>

<p>
DocVault is a secure and intelligent document management system that allows users to upload,
organize, and query their documents using AI-assisted search and summarization.
</p>

<p>
Built with a modern full-stack architecture, DocVault emphasizes privacy, scalability,
and free-tier safety, making it suitable for real-world applications, learning projects,
and resume portfolios.
</p>

<h1>🚀 Features</h1>

<h3>🔐 Authentication & Security</h3>
<p>
DocVault ensures strict user isolation so that documents are accessible only to their
respective owners. All APIs are protected, and sensitive configuration values are managed
through environment variables to follow security best practices.
</p>

<h3>📂 Document Management</h3>
<p>
Users can upload files into organized folders for better structure and accessibility.
The system supports soft deletion, allowing documents to remain recoverable until they
are permanently removed by scheduled background cleanup jobs.
</p>

<h3>🤖 AI-Powered Querying</h3>
<p>
Users can ask natural-language questions about their uploaded documents. The AI generates
responses strictly based on the content of those documents, ensuring accurate and
trustworthy answers without hallucinations.
</p>

<h3>🧠 Smart Context Building</h3>
<p>
DocVault builds AI prompts using document summaries to maintain relevance.
Context size is carefully limited to improve efficiency, and a graceful fallback
message is returned when the requested information is not found.
</p>

<h3>💸 Free-Tier Friendly Architecture</h3>
<p>
The system is designed to run without mandatory paid cloud services.
It avoids embedding-based AI quotas and prioritizes cost-safe architectural decisions,
making it ideal for students and independent developers.
</p>


## 📸 Screenshots

### Auth Section
<img width="1000" height="700" alt="Screenshot 2026-01-30 001619" src="https://github.com/user-attachments/assets/91bd581c-ad91-4df7-bd17-ae74a52b22bb" />


### Home Page
<img width="1000" height="700" alt="Screenshot 2026-01-29 230151" src="https://github.com/user-attachments/assets/6716ad96-5b98-4b8c-af6d-1fb647096da1" />


### Real Time Collaboration
<img width="1000" height="700" alt="Screenshot 2026-01-30 001352" src="https://github.com/user-attachments/assets/f8b347b4-5d97-453d-8f7a-081de7b59ab2" />




<h1>🏗️ Tech Stack</h1>

<h3>Frontend</h3>
<p>
The frontend is built using React with Vite for fast development and optimized builds.
Axios is used for API communication, and the application follows a clean,
component-based UI structure for maintainability and scalability.
</p>

<h3>Backend</h3>
<p>
The backend is implemented with Node.js and Express.js, exposing secure REST APIs
for authentication, document management, and AI-powered querying.
Gemini AI is used exclusively for text generation.
</p>

<h3>Database</h3>
<p>
PostgreSQL is used as the primary database with parameterized SQL queries instead of an ORM,
providing greater control and transparency. A soft-delete strategy is implemented along
with scheduled background cleanup jobs.
</p>

<h3>Cloud & Infrastructure</h3>
<p>
Supabase is used as a managed cloud backend, providing a production-ready PostgreSQL database
along with built-in authentication and row-level security. Supabase Auth is leveraged for
secure user management, while database-level constraints ensure strict per-user data isolation.
The architecture remains cloud-agnostic and can be migrated easily if required.
</p>

<h1>🧩 Architecture Overview</h1>

<p>
The client communicates with a REST API built on Node.js and Express.
Data is stored in PostgreSQL, and AI responses are generated using Gemini
based strictly on document context.
</p>

<p>
AI is used only for text generation, ensuring predictable usage and stability
within free-tier limits.
</p>

<h1>🧠 Design Philosophy</h1>

<p>
DocVault avoids expensive AI embeddings and vendor lock-in.
The system is designed with clear separation of concerns, predictable costs,
and the flexibility to introduce vector search or advanced AI features later
without major refactoring.
</p>

<h1>🧪 AI Query Behavior</h1>

<p>
If the requested information exists in the documents, the AI provides a concise
and factual response. If the information does not exist, the system clearly states
that it could not be found in the user’s documents.
</p>

<p>
This approach ensures transparency, reliability, and user trust.
</p>

<h1>📈 Future Enhancements</h1>

<p>
Planned enhancements include optional vector search with pgvector,
local HuggingFace embeddings, file-level citations, answer caching,
role-based access control, and Dockerized deployment.
</p>

<h1>🧠 Interview Talking Point</h1>

<p>
DocVault uses a controlled, RAG-like approach. Embeddings were intentionally avoided
due to free-tier limitations, and the system was designed to be modular so advanced
features can be added later without changing the core architecture.
</p>

<h1>👨‍💻 Author</h1>

<p>
<strong>Shreyansh Dixit</strong><br />
Aspiring Full-Stack Developer focused on backend systems,
clean APIs, and AI-assisted applications.
</p>
