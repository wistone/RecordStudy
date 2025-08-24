#!/usr/bin/env python3
"""
Run SQL setup for test data
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Extract connection details from Supabase URL
def get_db_connection_string():
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    # Extract database details from Supabase URL
    # Format: https://[project-ref].supabase.co
    project_ref = supabase_url.split('//')[1].split('.')[0]
    
    # Supabase connection details
    host = f"db.{project_ref}.supabase.co"
    database = "postgres"
    user = "postgres"
    password = service_key  # Service key is used as password
    port = 5432
    
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"

def execute_sql_file(file_path):
    """Execute SQL file using psycopg2"""
    try:
        conn_string = get_db_connection_string()
        conn = psycopg2.connect(conn_string)
        cursor = conn.cursor()
        
        with open(file_path, 'r') as file:
            sql_content = file.read()
        
        # Split by statements (basic splitting)
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip() and not stmt.strip().startswith('--')]
        
        for statement in statements:
            if statement and not statement.startswith('SELECT'):
                print(f"Executing: {statement[:50]}...")
                cursor.execute(statement)
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("SQL setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error executing SQL: {e}")
        return False

if __name__ == "__main__":
    success = execute_sql_file("setup_test_data.sql")
    if success:
        print("""
Test data created successfully!

Test users available:
- test (with sample records)
- wq (empty)
- wistone (empty)

You can now test the login with any of these usernames.
        """)
    else:
        print("Failed to create test data")