import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# Where Google OAuth should send the browser back to after login.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
