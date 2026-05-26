-- journeys
CREATE TABLE IF NOT EXISTS journeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_nickname TEXT NOT NULL,
    journey_name TEXT NOT NULL,
    template_type TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- journey_cities
CREATE TABLE IF NOT EXISTS journey_cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journey_id INTEGER NOT NULL,
    city_name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    sort_order INTEGER NOT NULL,
    transport TEXT NOT NULL,
    label TEXT,
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
);

-- duo_sessions
CREATE TABLE IF NOT EXISTS duo_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invite_code TEXT UNIQUE NOT NULL,
    user_a_id TEXT NOT NULL,
    user_b_id TEXT,
    user_a_nickname TEXT NOT NULL,
    user_b_nickname TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);

-- duo_nodes
CREATE TABLE IF NOT EXISTS duo_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_type TEXT NOT NULL CHECK(user_type IN ('A', 'B')),
    city_name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    sort_order INTEGER NOT NULL,
    label TEXT,
    meet_text TEXT,
    FOREIGN KEY (session_id) REFERENCES duo_sessions(id) ON DELETE CASCADE
);

-- eggs
CREATE TABLE IF NOT EXISTS eggs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    message TEXT NOT NULL,
    is_seed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- cities
CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city_name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    country TEXT NOT NULL,
    level TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journey_cities_journey_id ON journey_cities(journey_id);
CREATE INDEX IF NOT EXISTS idx_journeys_user_id ON journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_duo_nodes_session_id ON duo_nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_duo_sessions_invite_code ON duo_sessions(invite_code);
CREATE INDEX IF NOT EXISTS idx_eggs_city_name ON eggs(city_name);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(city_name);