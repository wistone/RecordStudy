import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise Exception("Missing Supabase configuration. Please check .env file.")

def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def get_supabase_admin_client() -> Client:
    """Get Supabase admin client with service key"""
    if not SUPABASE_SERVICE_KEY:
        raise Exception("Service key is required for admin operations")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Test connection
def test_connection():
    """Test Supabase connection"""
    try:
        supabase = get_supabase_client()
        result = supabase.table("profiles").select("*").limit(1).execute()
        return True, "Connection successful"
    except Exception as e:
        return False, str(e)