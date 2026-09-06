import json
import sqlite3


class LocalStore:
    def __init__(self, db_path="citylens.db"):
        self.connection = sqlite3.connect(db_path)
        self._create_table()

    # TODO: Add event timestamps/status fields if needed for retry monitoring
    # and cleanup policies.
    # TODO: Add cleanup/retention logic for successfully uploaded events
    # to prevent unlimited local database growth.
    def _create_table(self):
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event TEXT NOT NULL,
                uploaded INTEGER DEFAULT 0
            )
        """)

        self.connection.commit()

    def save_event(self, event):
        event_json = json.dumps(event)

        cursor = self.connection.execute(
            "INSERT INTO events (event) VALUES (?)",
            (event_json,)
        )

        self.connection.commit()

        return cursor.lastrowid

    def get_pending_events(self):
        cursor = self.connection.execute(
            "SELECT id, event FROM events WHERE uploaded = 0"
        )

        rows = cursor.fetchall()

        return [
            {
                "id": row[0],
                "event": json.loads(row[1])
            }
            for row in rows
        ]

    def mark_uploaded(self, event_id):
        self.connection.execute(
            "UPDATE events SET uploaded = 1 WHERE id = ?",
            (event_id,)
        )

        self.connection.commit()

    def close(self):
        self.connection.close()