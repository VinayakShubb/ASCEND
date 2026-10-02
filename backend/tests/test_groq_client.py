from types import SimpleNamespace

import httpx
import pytest

import config
from services import groq_client


def ok(text):
    return SimpleNamespace(status_code=200, json=lambda: {"choices": [{"message": {"content": text}}]}, text="")


def status(code):
    return SimpleNamespace(status_code=code, json=lambda: {}, text="error")


@pytest.fixture
def keys(monkeypatch):
    monkeypatch.setattr(config, "GROQ_API_KEYS", ["key-main-0001", "key-back-0002"])
    monkeypatch.setattr(groq_client, "_key_cooldowns", {})


def fake_post(responses, used_keys):
    def post(url, headers, json, timeout):
        used_keys.append(headers["Authorization"].removeprefix("Bearer "))
        result = responses.pop(0)
        if isinstance(result, Exception):
            raise result
        return result
    return post


def test_uses_the_main_key_when_it_works(keys, monkeypatch):
    used = []
    monkeypatch.setattr(groq_client.httpx, "post", fake_post([ok("hello")], used))

    assert groq_client.call_groq("hi") == "hello"
    assert used == ["key-main-0001"]


@pytest.mark.parametrize("failure", [status(429), status(401), status(503), httpx.ConnectError("down")])
def test_falls_back_to_the_next_key_on_retryable_failures(keys, monkeypatch, failure):
    used = []
    monkeypatch.setattr(groq_client.httpx, "post", fake_post([failure, ok("from backup")], used))

    assert groq_client.call_groq("hi") == "from backup"
    assert used == ["key-main-0001", "key-back-0002"]


def test_does_not_retry_bad_requests(keys, monkeypatch):
    used = []
    monkeypatch.setattr(groq_client.httpx, "post", fake_post([status(400)], used))

    assert groq_client.call_groq("hi") is None
    assert used == ["key-main-0001"]


def test_rate_limited_key_is_tried_last_for_a_while(keys, monkeypatch):
    used = []
    monkeypatch.setattr(groq_client.httpx, "post", fake_post([status(429), ok("a"), ok("b")], used))

    groq_client.call_groq("first")
    groq_client.call_groq("second")

    assert used == ["key-main-0001", "key-back-0002", "key-back-0002"]


def test_returns_none_when_every_key_fails(keys, monkeypatch):
    monkeypatch.setattr(groq_client.httpx, "post", fake_post([status(429), status(429)], []))

    assert groq_client.call_groq("hi") is None


def test_returns_none_without_any_key(monkeypatch):
    monkeypatch.setattr(config, "GROQ_API_KEYS", [])

    assert groq_client.call_groq("hi") is None


def test_legacy_single_key_variable_is_still_read(monkeypatch):
    import importlib

    monkeypatch.setenv("GROQ_API_KEYS", "a-key, b-key")
    monkeypatch.setenv("GROQ_API_KEY", "legacy-key")
    reloaded = importlib.reload(config)
    try:
        assert reloaded.GROQ_API_KEYS == ["a-key", "b-key", "legacy-key"]
    finally:
        monkeypatch.setenv("GROQ_API_KEYS", "")
        monkeypatch.setenv("GROQ_API_KEY", "")
        importlib.reload(config)
