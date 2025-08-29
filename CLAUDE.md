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

## Demo User
- **Email**: demo@example.com
- **Password**: abc123123
- **User ID**: 6d45fa47-7935-4673-ac25-bc39ca3f3481
- **Records**: 25+ sample learning entries with tags and resources

## Key Development Patterns

### Database Access Pattern
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

## Key Features & Improvements

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

### Recent UI/UX Enhancements
- **Detailed Record Creation**: Added "前往详细记录" link in quick record modal with form data transfer
- **Resource Creation Fields**: Integrated resource creation directly in detailed record form
- **Action Button Consolidation**: Moved edit/delete/cancel buttons to page header for consistency
- **Enhanced Record List**: Added dates, tags, and improved clickable record cards
- **Modal Styling Improvements**: Unified logout modal design and removed divider lines
- **Login Page Redesign**: Unified color scheme with main app, enhanced contrast, removed forgot password
- **Record Height Consistency**: Fixed record list items to maintain equal height during filtering
- **Icon Integration**: Added study.ico favicon across all HTML pages for brand consistency

### Performance Optimizations
- **Smart Caching**: Dashboard summaries cached for 5 minutes with automatic invalidation
- **API Efficiency**: Optimized record queries to include tag information in single request
- **Frontend State Management**: Improved data synchronization between views

### Data Integrity Fixes
- **Tag System Overhaul**: Automatic virtual resource creation enables all records to have tags
- **Delete Behavior**: Fixed 404 errors on successful deletions (idempotent behavior)
- **Tag Synchronization**: Fixed tags not showing after save/return to list
- **Time Zone Handling**: Proper UTC storage with local display conversion

The application is now production-ready with secure authentication, reliable data persistence, comprehensive tag management, and scalable architecture suitable for real users.