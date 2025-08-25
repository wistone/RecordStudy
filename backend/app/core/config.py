from decouple import config
from typing import List

class Settings:
    # Supabase 配置
    SUPABASE_URL: str = config('SUPABASE_URL')
    SUPABASE_ANON_KEY: str = config('SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_KEY: str = config('SUPABASE_SERVICE_KEY')
    
    # 数据库配置（已弃用 - 使用Supabase客户端）
    DATABASE_URL: str = config('DATABASE_URL', default='sqlite:///./temp.db')
    
    # JWT配置
    JWT_SECRET_KEY: str = config('SECRET_KEY', default='your-secret-key')
    JWT_ALGORITHM: str = 'HS256'
    
    # CORS配置 - 合并部署时同域，不需要复杂CORS配置
    CORS_ORIGINS: List[str] = config(
        'CORS_ORIGINS', 
        default="http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:8000,https://study-buddy.onrender.com",
        cast=lambda x: [origin.strip() for origin in x.split(',')]
    )
    
    # API配置
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RecordStudy API"

settings = Settings()