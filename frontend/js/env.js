// 环境变量配置
window.ENV = {
    SUPABASE_URL: 'https://rrkpxsjfuiptuufatnmx.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJya3B4c2pmdWlwdHV1ZmF0bm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDUzMjAsImV4cCI6MjA3MTYyMTMyMH0.x5TP-elB9X6j2BkA_ejrazkTBE-QKPRjyK_GeShIzpU',
    NODE_ENV: 'development',
    // API 后端地址 - 分离部署，指向 API 服务
    API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8000/api/v1'
        : 'https://your-study-buddy-api.onrender.com/api/v1'
};

console.log('✅ Supabase环境变量已加载');