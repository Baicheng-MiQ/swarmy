import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

DB_PATH = Path(__file__).parent / "swarmy.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    job_id      TEXT PRIMARY KEY,
    messages    TEXT NOT NULL,
    response_format TEXT,
    updated_at  TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'ready'
);

CREATE TABLE IF NOT EXISTS agents (
    agent_id    TEXT PRIMARY KEY,
    job_id      TEXT NOT NULL REFERENCES jobs(job_id),
    model_name  TEXT NOT NULL,
    temperature REAL,
    status      TEXT NOT NULL DEFAULT 'ready',
    last_update TEXT NOT NULL,
    response    TEXT,
    reasoning   TEXT,
    error       TEXT,
    input_token INTEGER,
    output_token INTEGER,
    cost        REAL
);
"""


async def init_db() -> None:
    """Create tables if they don't exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(_SCHEMA)
        await db.commit()


async def create_job(
    *,
    messages: list[dict],
    response_format: dict | None,
    agents: list[dict],
) -> dict:
    """Insert a job and its agents. Returns job_id and agent details."""
    now = datetime.now(timezone.utc).isoformat()
    job_id = str(uuid.uuid4())

    agent_rows: list[dict] = []
    for spec in agents:
        agent_rows.append(
            {
                "agent_id": str(uuid.uuid4()),
                "model_name": spec["model_name"],
                "temperature": spec.get("temperature"),
            }
        )

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO jobs (job_id, messages, response_format, updated_at, status) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                job_id,
                json.dumps(messages),
                json.dumps(response_format) if response_format else None,
                now,
                "ready",
            ),
        )
        await db.executemany(
            "INSERT INTO agents "
            "(agent_id, job_id, model_name, temperature, status, last_update) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            [
                (
                    a["agent_id"],
                    job_id,
                    a["model_name"],
                    a["temperature"],
                    "ready",
                    now,
                )
                for a in agent_rows
            ],
        )
        await db.commit()

    return {
        "job_id": job_id,
        "agents": [
            {
                "agent_id": a["agent_id"],
                "model_name": a["model_name"],
                "status": "ready",
            }
            for a in agent_rows
        ],
    }
