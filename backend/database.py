import logging
import time

import httpx
from supabase import create_client, Client

import config

logger = logging.getLogger(__name__)

# Used only for real auth actions: sign up, sign in, oauth, refresh, token
# verification. Must use the anon key -- the service role key skips password
# checks entirely and would make "login" always succeed.
auth_client: Client = create_client(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)

# Used for every table read/write (profiles, habits, habit_logs). This uses
# the service role key, which bypasses Postgres row-level security. That's
# safe here because the backend is now the trust boundary: every route below
# calls get_current_user() first and manually filters by that user's id
# before touching their rows.
db_client: Client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)


# Connection-level failures that mean "the request never got a proper
# answer", typically because Supabase closed a pooled keep-alive connection
# while it sat idle. Retrying on a fresh connection fixes them.
RETRYABLE_ERRORS = (httpx.RemoteProtocolError, httpx.ReadError, httpx.WriteError, httpx.ConnectError)


class RetryTransport(httpx.BaseTransport):
    """Wraps an httpx transport and retries connection drops a couple of
    times. Without this, the first requests after an idle period failed with
    "Server disconnected" and came back to the user as 500s (or, for token
    checks, as a false "logged out")."""

    def __init__(self, inner: httpx.BaseTransport, retries: int = 2):
        self.inner = inner
        self.retries = retries

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        for attempt in range(self.retries + 1):
            try:
                return self.inner.handle_request(request)
            except RETRYABLE_ERRORS as e:
                if attempt == self.retries:
                    raise
                logger.warning("Supabase connection dropped (%s); retrying", type(e).__name__)
                time.sleep(0.05 * (attempt + 1))
        raise RuntimeError("unreachable")

    def close(self) -> None:
        self.inner.close()


def _install_retry(client: httpx.Client) -> None:
    if not isinstance(client._transport, RetryTransport):
        client._transport = RetryTransport(client._transport)


# Every HTTP client the backend uses to reach Supabase.
_install_retry(db_client.postgrest.session)
_install_retry(db_client.auth._http_client)
_install_retry(auth_client.auth._http_client)
