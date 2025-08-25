# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**学习搭子 (Learning Buddy)** is a learning tracking and analytics application that helps users record their daily learning activities, track progress, and receive insights. The project is a full-stack MVP consisting of:

- **Frontend**: Vanilla HTML/CSS/JavaScript single-page application with learning record forms, analytics dashboards, and calendar views
- **Backend**: PostgreSQL database with comprehensive schema for learning records, resources, and user analytics
- **Target Users**: Chinese-speaking learners who want to digitize their learning journey

## Development Environment

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Database**: PostgreSQL with extensions (pg_trgm, citext)
- **Architecture**: Client-side SPA with future server integration planned

### Database Setup
The database schema is defined in `sql/001-init.sql`. Key requirements:
- PostgreSQL with `pg_trgm` and `citext` extensions enabled
- Run the initialization script to create all tables, indexes, and RLS policies
- The schema supports multi-tenant architecture with Row Level Security

### Running the Application
Since this is a frontend prototype:
1. Serve the `frontend/` directory using any static file server
2. For development: `python -m http.server 8000` from the `frontend/` directory
3. Access at `http://localhost:8000`

## Code Architecture

### Frontend Structure (`frontend/`)
- `index.html` - Main SPA with all pages and modal components
- `js/app.js` - Core application logic with LearningBuddyApp class
- `styles/main.css` - Complete styling (not examined in detail)

### Key Frontend Classes and Methods
**LearningBuddyApp Class** (`frontend/js/app.js`):
- `loadMockData()` - Generates realistic learning data for prototype (30% month coverage)
- `navigateTo(page)` - SPA routing between home/records/analytics pages
- `showQuickRecord()` - Modal-based record creation with two modes (form/quick note)
- `updateDashboard()` - Real-time statistics calculation and display
- `renderAnalytics()` - Complex analytics generation with insights
- `renderChart()` - Time-based learning duration visualization with period switching

### Database Schema (`sql/`)

**Core Tables**:
- `records` - Central learning record table with rich metadata (duration, mood, difficulty, focus, energy ratings)
- `resources` - Shared learning resources with deduplication via URL/ISBN/platform_id
- `user_resources` - User-specific resource relationships (status, ratings, progress)

**Support Tables**:
- `profiles` - Extended user profiles
- `tags` + `resource_tags` - Flexible tagging system supporting both system and user tags
- `user_summaries` - Pre-computed analytics for performance

**Key Features**:
- Comprehensive enum types for standardized data (resource_type, privacy_level, etc.)
- Advanced indexing for Chinese text search using pg_trgm
- Row Level Security (RLS) policies for multi-tenant data isolation
- Automatic timestamp management with triggers

### PRD Requirements (`prd/`)
Based on `prd-mvp.md` and `data-metric.md`:

**Core Features**:
- **Quick Recording**: 4-step form (type → category → title → duration) + freeform "quick notes"
- **Feedback System**: Mood tracking, difficulty/focus/energy ratings (1-5 scale)
- **Analytics**: Multi-dimensional statistics (time, category, resource, teacher/platform)
- **AI Insights**: Daily/weekly summaries with "next action" recommendations

**Success Metrics**:
- Daily Active Records per Engaged user (DARE) ≥ 2
- Effective learning time median ≥ 35min/day
- Record creation time ≤ 10s (form) or ≤ 5s (quick note)
- Auto-structure hit rate ≥ 70%

## Key Development Patterns

### Data Flow
1. User creates records via modal forms or quick notes
2. Data stored in `this.records` array (prototype) / PostgreSQL (production)
3. Dashboard and analytics auto-update via reactive methods
4. Complex analytics pre-computed for performance

### State Management
- Single LearningBuddyApp instance manages all application state
- Page navigation via `navigateTo()` with active class toggling
- Modal state managed through `showQuickRecord()` / `closeQuickRecord()`
- Form state tracked in `this.recordData` object

### Chinese Localization
- All UI text in Simplified Chinese
- Date/time formatting using Chinese locale (`toLocaleDateString('zh-CN')`)
- Database supports Chinese text search via pg_trgm extension
- Category suggestions include Chinese learning topics (英语, AI, 数学, etc.)

## Development Guidelines

### Database Changes
- Always update both `sql/001-init.sql` and `sql/database-schema.md` documentation
- Test RLS policies with different user contexts
- Consider performance impact of new indexes on large datasets
- Use appropriate enum types for standardized values

### Frontend Development
- Maintain vanilla JavaScript approach (no frameworks)
- Follow existing patterns for DOM manipulation and event handling
- Update mock data generation in `loadMockData()` when adding new record types
- Ensure responsive design works across different screen sizes

### Analytics Features
- Pre-compute expensive calculations where possible
- Support multiple time periods (daily/weekly/monthly/yearly)
- Generate actionable insights, not just raw statistics
- Consider data visualization best practices for Chinese users

### Testing Approach
- Use realistic mock data that reflects actual usage patterns
- Test edge cases like empty states and data boundaries
- Verify Chinese text handling and search functionality
- Validate form input handling and error states