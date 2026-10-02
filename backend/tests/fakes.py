"""A tiny in-memory stand-in for the supabase-py client, just covering the
handful of query builder methods the routes actually call
(table/select/insert/update/delete/eq/order/limit/execute). Lets route tests
run against realistic CRUD behavior without touching a real database.

Unique constraints from supabase_schema.sql are enforced on insert (raising
the same APIError code 23505 Postgres would), so race-handling code paths
can be tested too.
"""

import itertools
import uuid
from datetime import datetime, timedelta, timezone

from postgrest.exceptions import APIError

# Mirrors the UNIQUE constraints in supabase_schema.sql.
UNIQUE_KEYS: dict[str, list[tuple[str, ...]]] = {
    "habit_logs": [("habit_id", "date")],
    "profiles": [("username",), ("id",)],
}


# Strictly increasing created_at values: on Windows, datetime.now() can return
# the same value for rows inserted back to back, which would make "newest
# first" ordering ambiguous in tests.
_tick = itertools.count()


def _now_iso() -> str:
    return (datetime.now(timezone.utc) + timedelta(microseconds=next(_tick))).isoformat()


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, rows: list[dict], unique_keys: list[tuple[str, ...]] | None = None):
        self._rows = rows
        self._unique_keys = unique_keys or []
        self._limit: int | None = None
        self._filters: list[tuple[str, object]] = []
        self._mode = "select"
        self._payload = None
        self._order_key = None

    def select(self, *_args, **_kwargs):
        self._mode = "select"
        return self

    def insert(self, payload: dict):
        self._mode = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict):
        self._mode = "update"
        self._payload = payload
        return self

    def delete(self):
        self._mode = "delete"
        return self

    def eq(self, key: str, value):
        self._filters.append((key, value))
        return self

    def order(self, key: str, desc: bool = False):
        self._order_key = (key, desc)
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    def _matching(self) -> list[dict]:
        rows = self._rows
        for key, value in self._filters:
            rows = [r for r in rows if r.get(key) == value]
        return rows

    def execute(self) -> FakeResult:
        if self._mode == "select":
            rows = self._matching()
            if self._order_key:
                key, desc = self._order_key
                rows = sorted(rows, key=lambda r: r.get(key), reverse=desc)
            if self._limit is not None:
                rows = rows[: self._limit]
            return FakeResult(rows)

        if self._mode == "insert":
            new_row = dict(self._payload)
            new_row.setdefault("id", str(uuid.uuid4()))
            new_row.setdefault("created_at", _now_iso())
            new_row.setdefault("archived", False)
            new_row.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
            for columns in self._unique_keys:
                if any(all(r.get(c) == new_row.get(c) for c in columns) for r in self._rows):
                    raise APIError({"code": "23505", "message": "duplicate key value violates unique constraint"})
            self._rows.append(new_row)
            return FakeResult([new_row])

        if self._mode == "update":
            matched = self._matching()
            for row in matched:
                row.update(self._payload)
            return FakeResult(matched)

        if self._mode == "delete":
            matched = self._matching()
            for row in matched:
                self._rows.remove(row)
            return FakeResult(matched)

        raise ValueError(f"unsupported mode {self._mode}")


class FakeAuthAdmin:
    def __init__(self):
        self.deleted_user_ids: list[str] = []

    def delete_user(self, user_id: str):
        self.deleted_user_ids.append(user_id)


class FakeAuth:
    def __init__(self):
        self.admin = FakeAuthAdmin()


class FakeSupabaseClient:
    def __init__(self):
        self.tables: dict[str, list[dict]] = {"habits": [], "habit_logs": [], "profiles": [], "ai_generations": []}
        self.auth = FakeAuth()

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.tables[name], UNIQUE_KEYS.get(name))
