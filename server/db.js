import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const initDB = async () => {
  /* ---------- USERS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      public_id TEXT UNIQUE NOT NULL,
      auth_uuid UUID UNIQUE,   
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone_number TEXT UNIQUE,
      profile_image TEXT,
      created_at TIMESTAMP DEFAULT NOW() ,
      otp TEXT,
      otp_expiry TIMESTAMP,
      failed_attempts INT DEFAULT 0,
      locked_until TIMESTAMP DEFAULT null
    );
  `);

  await db.query(`
      CREATE TABLE IF NOT EXISTS google_drive_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        refresh_token TEXT NOT NULL,
        connected_at TIMESTAMP DEFAULT NOW()
    );`);

  /* ---------- FOLDERS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS folders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      folder_name TEXT NOT NULL,
      category TEXT DEFAULT 'PRIVATE',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  /* ---------- FILES (WITH VECTOR EMBEDDING) ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      folder_id INTEGER,
      FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      encrypted_name TEXT NOT NULL,
      encrypted_link TEXT NOT NULL,
      file_type TEXT,
      size INTEGER,
      storage TEXT,
      ai_summary TEXT,
      tessract_extracted_text TEXT,
      new_embedding vector(3072), --pgvector added here

      created_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP DEFAULT NULL,
      permanent_expiry TIMESTAMP DEFAULT NULL
    );
  `);

  // vector indexx using ivfflat
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_files_embedding
    ON files
    USING ivfflat (new_embedding vector_cosine_ops)
    WITH (lists = 100);
  `);

  /* ---------- REFRESH TOKENS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      revoked BOOLEAN DEFAULT FALSE
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
    ON refresh_tokens(token);
  `);

  /* ---------- CONNECTION REQUESTS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS connections (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
      
    );
  `);

  /* ---------- FRIENDS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS friends (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      show_folders BOOLEAN DEFAULT FALSE,
      PRIMARY KEY (user_id, friend_id)
    );
  `);

  /* ---------- NOTIFICATIONS ---------- */
  await db.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,

    sender_id INTEGER NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,

    sender_name TEXT,
    sender_profile_image TEXT,

    text_notification TEXT,
    file_route TEXT,

    type TEXT,
    status TEXT DEFAULT 'PENDING',
    seen BOOLEAN DEFAULT FALSE,

    room_name TEXT,
    room_id UUID,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (user_id, sender_id, type)
  );
`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
  chat_id INTEGER ,
  FOREIGN KEY (chat_id) REFERENCES connections(id) ON DELETE CASCADE,
  user1_id INTEGER,
  FOREIGN KEY( user1_id) REFERENCES users(id) ON DELETE CASCADE,
  user2_id INTEGER,
  FOREIGN KEY( user2_id) REFERENCES users(id) ON DELETE CASCADE,
  
  created_at TIMESTAMP DEFAULT NOW()
  



    )
    `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


  `);

  await db.query(`
   CREATE TABLE IF NOT EXISTS ai_query_jobs (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    query TEXT NOT NULL,

    response TEXT,

    query_embedding VECTOR(3072),

    response_embedding VECTOR(3072),

    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',

    bullmq_job_id VARCHAR(100),

    file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,

    folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL,

    error_message TEXT,

    retry_count INTEGER DEFAULT 0,

    started_at TIMESTAMP,

    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW()
); 
    `);

  // await db.query(
  //   `CREATE INDEX IF NOT EXISTS ai_query_jobs_hnsw_indexing
  //      ON ai_query_jobs
  //      USING hnsw(query_embedding vector_cosine_ops)`,
  // );

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id);
  `);

  // ---------- ROOMS ----------

  await db.query(`
  CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    host_id INTEGER NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,

    name VARCHAR(255),

    status VARCHAR(30) NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'ended')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    ended_at TIMESTAMPTZ
    
  );
`);

  // ---------- ROOM MEMBERS ----------

  await db.query(`
  CREATE TABLE IF NOT EXISTS room_members (
    id BIGSERIAL PRIMARY KEY,

    room_id UUID NOT NULL
      REFERENCES rooms(id)
      ON DELETE CASCADE,

    user_id INTEGER NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL DEFAULT 'member'
      CHECK (role IN ('host', 'member')),

    status VARCHAR(20) NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'left', 'kicked')),

    joined_at TIMESTAMPTZ,

    left_at TIMESTAMPTZ,

    kicked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(room_id, user_id)
  );
`);

  // ---------- ROOM INVITATIONS ----------

  await db.query(`
  CREATE TABLE IF NOT EXISTS room_invitations (
    id BIGSERIAL PRIMARY KEY,

    room_id UUID NOT NULL
      REFERENCES rooms(id)
      ON DELETE CASCADE,

    inviter_id INTEGER NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,

    invitee_id INTEGER NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
      CHECK (
        status IN (
          'pending',
          'accepted',
          'rejected',
          'revoked',
          'expired'
        )
      ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    responded_at TIMESTAMPTZ,

    UNIQUE(room_id, invitee_id)
  );
`);

  // ---------- ROOM MESSAGES ----------

  await db.query(`
  CREATE TABLE IF NOT EXISTS room_messages (
    id BIGSERIAL PRIMARY KEY,

    room_id UUID NOT NULL
      REFERENCES rooms(id)
      ON DELETE CASCADE,

    sender_id INTEGER NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ,

    deleted_at TIMESTAMPTZ
  );
`);

  // ---------- ROOM EVENTS ----------

  await db.query(`
  CREATE TABLE IF NOT EXISTS room_events (
    id BIGSERIAL PRIMARY KEY,

    room_id UUID NOT NULL
      REFERENCES rooms(id)
      ON DELETE CASCADE,

    actor_id INTEGER
      REFERENCES users(id)
      ON DELETE SET NULL,

    target_user_id INTEGER
      REFERENCES users(id)
      ON DELETE SET NULL,

    event_type VARCHAR(50) NOT NULL,

    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

  // composio integration

  await db.query(`
  CREATE TABLE IF NOT EXISTS user_integrations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    connected_account_id VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'DISCONNECTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, provider)
);
  `);

  console.log(" PostgreSQL connected & tables initialized (pgvector enabled)");
};
