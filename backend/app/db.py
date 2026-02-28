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
    cost        REAL,
    persona     TEXT
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
                "persona": spec.get("persona"),
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
            "(agent_id, job_id, model_name, temperature, status, last_update, persona) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                (
                    a["agent_id"],
                    job_id,
                    a["model_name"],
                    a["temperature"],
                    "ready",
                    now,
                    a["persona"],
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


async def get_job(job_id: str) -> dict | None:
    """Fetch a job and all its agents. Returns None if not found."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT job_id, messages, response_format, updated_at, status "
            "FROM jobs WHERE job_id = ?",
            (job_id,),
        )
        job_row = await cursor.fetchone()
        if job_row is None:
            return None

        cursor = await db.execute(
            "SELECT agent_id, model_name, temperature, status, last_update, "
            "response, reasoning, error, input_token, output_token, cost, persona "
            "FROM agents WHERE job_id = ?",
            (job_id,),
        )
        agent_rows = await cursor.fetchall()

    return {
        "job_id": job_row["job_id"],
        "messages": json.loads(job_row["messages"]),
        "response_format": json.loads(job_row["response_format"]) if job_row["response_format"] else None,
        "updated_at": job_row["updated_at"],
        "status": job_row["status"],
        "agents": [
            {
                "agent_id": a["agent_id"],
                "model_name": a["model_name"],
                "temperature": a["temperature"],
                "status": a["status"],
                "last_update": a["last_update"],
                "response": a["response"],
                "reasoning": a["reasoning"],
                "error": a["error"],
                "input_token": a["input_token"],
                "output_token": a["output_token"],
                "cost": a["cost"],
                "persona": a["persona"],
            }
            for a in agent_rows
        ],
    }


async def update_job_status(job_id: str, status: str) -> None:
    """Update a job's status and updated_at timestamp."""
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE jobs SET status = ?, updated_at = ? WHERE job_id = ?",
            (status, now, job_id),
        )
        await db.commit()


async def update_agent(agent_id: str, **fields) -> None:
    """Update one or more fields on an agent row. Always sets last_update."""
    fields["last_update"] = datetime.now(timezone.utc).isoformat()
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values())
    values.append(agent_id)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            f"UPDATE agents SET {set_clause} WHERE agent_id = ?",
            values,
        )
        await db.commit()
