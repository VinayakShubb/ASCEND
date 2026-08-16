"""A tiny in-memory stand-in for the supabase-py client, just covering the
handful of query builder methods the routes actually call
(table/select/insert/update/delete/eq/order/limit/execute). Lets route tests
run against realistic CRUD behavior without touching a real database.
"""

import uuid
from datetime import datetime, timezone


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, rows: list[dict]):
        self._rows = rows
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

    def limit(self, _n: int):
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
            return FakeResult(rows)

        if self._mode == "insert":
            new_row = dict(self._payload)
            new_row.setdefault("id", str(uuid.uuid4()))
            new_row.setdefault("created_at", datetime.now(timezone.utc).isoformat())
            new_row.setdefault("archived", False)
            new_row.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
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


class FakeSupabaseClient:
    def __init__(self):
        self.tables: dict[str, list[dict]] = {"habits": [], "habit_logs": [], "profiles": []}

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.tables[name])
