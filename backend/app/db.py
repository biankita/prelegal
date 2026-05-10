import os
import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .config import settings


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type TEXT,
    nda_values TEXT NOT NULL DEFAULT '{}',
    generic_values TEXT NOT NULL DEFAULT '{}',
    messages TEXT NOT NULL DEFAULT '[]',
    is_complete INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_user_updated
    ON documents(user_id, updated_at DESC);
"""


def reset_database() -> None:
    """Wipe and recreate the SQLite file. Called once on app startup so each
    container start gets a fresh DB, per the V1 foundation spec."""
    path = settings.db_path
    if os.path.exists(path):
        os.remove(path)
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(settings.db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
