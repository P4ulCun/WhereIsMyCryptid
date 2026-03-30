import sqlite3
from datetime import date
from typing import Optional

DB_PATH = "usage.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usage (
            key TEXT,
            usage_date TEXT,
            count INTEGER,
            PRIMARY KEY (key, usage_date)
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')
    # Default uploads_enabled to 'false' if not already set
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('uploads_enabled', 'false')")
    
    conn.commit()
    conn.close()

def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else default

def set_setting(key: str, value: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', (key, value))
    conn.commit()
    conn.close()

def get_usage(key: str) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    today = date.today().isoformat()
    cursor.execute('SELECT count FROM usage WHERE key = ? AND usage_date = ?', (key, today))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else 0

def increment_usage(key: str, amount: int = 1) -> int:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    today = date.today().isoformat()
    
    cursor.execute('SELECT count FROM usage WHERE key = ? AND usage_date = ?', (key, today))
    row = cursor.fetchone()
    
    if row:
        new_count = row[0] + amount
        cursor.execute('UPDATE usage SET count = ? WHERE key = ? AND usage_date = ?', (new_count, key, today))
    else:
        new_count = amount
        cursor.execute('INSERT INTO usage (key, usage_date, count) VALUES (?, ?, ?)', (key, today, new_count))
        
    conn.commit()
    conn.close()
    return new_count

def get_all_usage() -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    today = date.today().isoformat()
    cursor.execute('SELECT key, count FROM usage WHERE usage_date = ?', (today,))
    rows = cursor.fetchall()
    conn.close()
    return [{"key": row[0], "count": row[1]} for row in rows]

# Initialize DB when module is imported
init_db()
