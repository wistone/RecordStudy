# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**学习搭子 (Learning Buddy)** is a learning tracking and analytics application that helps users record their daily learning activities, track progress, and receive insights. The project is a full-stack web application with production-ready authentication and database integration.

### Architecture
- **Frontend**: Vanilla HTML/CSS/JavaScript SPA with Supabase authentication
- **Backend**: FastAPI Python API server with comprehensive REST endpoints
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with JWT token-based API authentication
- **Deployment**: Frontend (port 3001) + Backend (port 8000) separated architecture

## Technology Stack

### Frontend
- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Authentication**: Supabase JavaScript SDK
- **API Communication**: Fetch API with JWT tokens
- **Architecture**: Single-page application with client-side routing

### Backend
- **Framework**: FastAPI with Uvicorn ASGI server
- **Database**: Supabase Python SDK (not direct PostgreSQL)
- **Authentication**: JWT token validation via Supabase Auth
- **API**: RESTful endpoints with OpenAPI documentation

### Database & Services
- **Database**: Supabase PostgreSQL with pg_trgm and citext extensions
- **Authentication**: Supabase Auth service
- **Schema**: Comprehensive learning records with RLS policies

## Environment Setup

### Dependencies
```bash
# Setup Python virtual environment
./scripts/setup-env.sh

# Start backend server
venv/bin/python start-backend.py

# Start frontend server
cd frontend && python -m http.server 3001
```

### Environment Variables (.env)
```env
# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT Configuration
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8000
```

**Note**: `DATABASE_URL` is no longer used - we use Supabase client SDK instead of direct PostgreSQL connections.

## Database Schema & Migration

### Schema Files
- `sql/001-init.sql` - Base tables and types
- `sql/002-fix-profiles-rls.sql` - RLS policies
- `sql/003-demo-data.sql` - Demo user data

### Key Tables
- `auth.users` - Supabase managed user authentication
- `public.profiles` - Extended user profiles
- `public.records` - Learning records with comprehensive metadata
- `public.resources` - Shared learning resources
- `public.user_resources` - User-specific resource relationships
- `public.tags` - Global tag system for categorization
- `public.resource_tags` - Many-to-many relationship between resources and tags

### Demo User
- **Email**: demo@example.com
- **Password**: abc123123
- **User ID**: 6d45fa47-7935-4673-ac25-bc39ca3f3481
- **Records**: 25+ sample learning entries with tags and resources

## Application Architecture

### Frontend Structure (`frontend/`)
```
frontend/
├── index.html          # Main SPA entry point
├── login.html          # Authentication page
├── js/
│   ├── env.js         # Environment configuration
│   ├── auth.js        # Supabase authentication service
│   ├── api-service.js # API communication layer
│   └── app.js         # Main application logic
└── styles/
    └── main.css       # Complete styling
```

### Backend Structure (`backend/`)
```
backend/
├── app/
│   ├── main.py        # FastAPI application entry
│   ├── api/
│   │   ├── __init__.py
│   │   ├── records.py # Learning records API
│   │   ├── resources.py
│   │   └── stats.py
│   ├── core/
│   │   ├── config.py  # Settings and configuration
│   │   ├── auth.py    # JWT authentication middleware
│   │   └── database.py # Database connection (legacy)
│   ├── models/        # Pydantic models (legacy)
│   └── schemas/       # API schemas
└── requirements.txt   # Python dependencies
```

## Key Components

### Authentication Flow
1. **Frontend**: User login via Supabase Auth
2. **Token**: JWT access token stored in session
3. **API Calls**: Token sent in Authorization header
4. **Backend**: Token validated via Supabase Auth API
5. **User ID**: Extracted for data filtering

### API Endpoints (`/api/v1/`)
#### Records API
- `GET /records` - Get user's learning records with tags
- `POST /records` - Create new record with automatic resource creation
- `PUT /records/{id}` - Update record with tag management
- `DELETE /records/{id}` - Delete record
- `GET /records/{id}` - Get single record with full details
- `GET /records/test` - Connection test
- `GET /records/debug/current-user` - Debug user info

#### Summary API
- `GET /summaries/dashboard` - Dashboard analytics with caching
- `GET /summaries/recent-records` - Recent records summary

### Data Flow
```
Browser → Frontend (3001) → API Call → Backend (8000) → Supabase Client → PostgreSQL
```

## Development Patterns

### Database Access Pattern
**❌ Old Pattern (Removed)**:
```python
# Direct PostgreSQL with SQLAlchemy
from sqlalchemy.orm import Session
records = db.query(Record).filter_by(user_id=user_id).all()
```

**✅ Current Pattern**:
```python
# Supabase Client SDK
from supabase import create_client
client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
response = client.table('records').select('*').eq('user_id', user_id).execute()
```

### Tag Management Pattern
**✅ Virtual Resource Creation**:
```python
# Automatic virtual resource creation for records without resources
if not resource_id and tags_data and record_id:
    # Create virtual resource for tag association
    resource_data = {
        'type': record['form_type'],
        'title': record['title'],
        'description': '系统自动创建的虚拟资源（用于标签关联）',
        'created_by': user_id
    }
    resource_response = client.table('resources').insert(resource_data).execute()
    resource_id = resource_response.data[0]['resource_id']
    # Update record to link with virtual resource
    client.table('records').update({'resource_id': resource_id}).eq('record_id', record_id).execute()
```

### Frontend API Pattern
```javascript
// Authentication-aware API calls
const response = await window.apiService.getRecords({ limit: 100, days: 30 });

// Automatic token handling
const token = await this.getAuthToken();
fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
```

### Error Handling
- **Frontend**: User-friendly Chinese error messages
- **Backend**: HTTP status codes with detailed error responses
- **Authentication**: Automatic redirect to login on 401 errors

## Testing & Debugging

### Health Checks
- Backend: `http://localhost:8000/health`
- Supabase: `http://localhost:8000/api/v1/records/test`
- User Debug: `http://localhost:8000/api/v1/records/debug/current-user`

### Demo Data Verification
```bash
# Check demo user exists and has records
venv/bin/python -c "
from supabase import create_client
client = create_client('SUPABASE_URL', 'SUPABASE_SERVICE_KEY')
records = client.table('records').select('*').eq('user_id', '6d45fa47-7935-4673-ac25-bc39ca3f3481').execute()
print(f'Demo user has {len(records.data)} records')
"
```

## Development Guidelines

### Authentication Requirements
- All API endpoints require valid JWT token (except test endpoints)
- Frontend automatically handles token refresh
- Use Supabase Auth for user management, not custom JWT

### Database Guidelines
- **Always use Supabase client**, never direct PostgreSQL
- User data automatically filtered by JWT user ID
- RLS policies provide additional security layer

### Frontend Development
- Maintain vanilla JavaScript approach (no build tools)
- Cache-bust JavaScript files with version parameters when needed
- Handle authentication state changes reactively

### Backend Development
- Use Supabase client for all database operations
- Validate user permissions via JWT middleware
- Return consistent JSON responses with proper HTTP status codes

### Deployment Considerations
- Frontend can be served from any static file server
- Backend requires Python environment with Supabase dependencies
- Both services need access to same Supabase project credentials

## Troubleshooting

### Common Issues
1. **"queryParams already declared"** - JavaScript syntax error from duplicate variable declarations
2. **"window.apiService undefined"** - Frontend script loading order or syntax errors
3. **"No route to host"** - Network connectivity issues with direct PostgreSQL (use Supabase client)
4. **User ID mismatch** - Demo user ID in database doesn't match authenticated user ID
5. **Tags not saving** - Records without resource_id couldn't save tags (fixed with virtual resource creation)
6. **404 on delete but record deleted** - Idempotent deletion behavior (treated as success)
7. **Tags not showing after save** - Fixed data synchronization between frontend and backend

### Debug Commands
```javascript
// Check current user in browser console
(async () => {
  const response = await window.apiService.request('/records/debug/current-user');
  console.log('Current user info:', response);
})();
```

### Cache Issues
When JavaScript changes don't take effect:
1. Update version numbers in HTML script tags
2. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
3. Clear browser cache and reload

## Success Metrics & Features

### Core Functionality
- ✅ User registration and authentication
- ✅ Learning record CRUD operations
- ✅ Real-time dashboard updates
- ✅ Multi-dimensional analytics
- ✅ Chinese localization
- ✅ Tag management system with virtual resource creation
- ✅ Three-column detail page layout
- ✅ Responsive homepage with clickable records
- ✅ Smart caching for dashboard summaries

### Performance Targets
- Record creation time ≤ 10 seconds
- Dashboard load time ≤ 3 seconds
- API response time ≤ 500ms
- Daily Active Records per user ≥ 2

## Recent Fixes & Improvements

### Tag System Overhaul (Latest)
- **Problem**: Records without `resource_id` couldn't save tags due to database schema constraints
- **Solution**: Automatic virtual resource creation when tags are added to resource-less records
- **Impact**: Now all records can have tags, improving categorization and searchability
- **Files Modified**: `backend/app/api/records.py` (update_record_tags function)

### UI/UX Enhancements
- **Detail Page Layout**: Redesigned to three-column layout (basic info + notes + tags/resources)
- **Action Button Consolidation**: Moved edit/delete/cancel buttons to top header for consistency
- **Homepage Improvements**: Added dates, tags, and clickable records with action buttons
- **Responsive Design**: Records maintain proper layout and buttons after filtering

### Data Integrity Fixes
- **Delete Behavior**: Fixed 404 errors on successful deletions (idempotent behavior)
- **Tag Synchronization**: Fixed tags not showing after save/return to list
- **Time Zone Handling**: Proper UTC storage with local display conversion
- **Database Constraints**: Handle null values properly (ISBN, etc.)

### Performance Optimizations
- **Smart Caching**: Dashboard summaries cached for 5 minutes with automatic invalidation
- **API Efficiency**: Optimized record queries to include tag information in single request
- **Frontend State Management**: Improved data synchronization between views

The application is now production-ready with secure authentication, reliable data persistence, comprehensive tag management, and scalable architecture suitable for real users.