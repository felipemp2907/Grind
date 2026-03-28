# Grind - Your AI Assistant for Daily Discipline

Created by fmp

## Recent Updates

### 🎨 Monochrome Theme Refresh

**Design Updates:**
- **Monochrome Palette**: Replaced purple accents with clean black-and-white design
- **Functional Colors**: Success (green) and warning (amber) states preserved for clarity
- **Enhanced Contrast**: Improved readability with refined background and text colors
- **Modern Aesthetic**: Minimalist design inspired by iOS, Instagram, and Linear

### 🎯 Focus Mode & Task Generation Improvements

**Fixed Issues:**
1. **Focus Mode Shortcut** - Added missing entry tile on Home tab that appears when tasks are in progress
2. **Profile Editor** - Fixed save functionality using upsert instead of update, added success/error toasts
3. **Task Generator** - Implemented Goal-Clarification Flow to reduce overwhelm and duplicates

**New Features:**
- **Goal Clarification Wizard**: 5-step questionnaire to gather context before task generation
- **Smart Task Processing**: Post-processing checklist that caps tasks (≤3), deduplicates, and validates proof modes
- **Focus Mode Screen**: Complete 25-minute Pomodoro timer with progress tracking
- **Enhanced AI Context**: Alvo now uses goal context to generate more realistic, personalized tasks

**Technical Improvements:**
- String similarity algorithm for duplicate detection (Levenshtein distance)
- Proof mode auto-detection based on task keywords
- Load score budgeting to prevent task overwhelm
- Toast notifications for better user feedback
- Comprehensive error handling and fallbacks

## Setup

### Database Setup (Required)

Before using Grind, you need to set up the database tables in your Supabase project:

1. **Copy the SQL script**: The app will show you a database setup prompt with a "Copy SQL Script" button
2. **Open Supabase Dashboard**: Go to [supabase.com/dashboard](https://supabase.com/dashboard) and select your project
3. **Navigate to SQL Editor**: Find "SQL Editor" in the left sidebar
4. **Run the script**: Paste the SQL and click "Run" to create all tables and policies
5. **Verify setup**: Return to the app and tap "Check Setup" to continue

The setup creates:
- User profiles and authentication
- Goals and milestones tracking  
- Tasks and habit management
- Journal entries storage
- Secure data access policies

### Development

Run Edge deploy, then sign in to test Focus shortcut and new features.

### Theming

Grind now uses a monochrome palette: white accents on a charcoal background. The only colours outside black-and-white are functional greens and ambers for success and warnings.

**Color Tokens:**
- Background: `#0E0E12` (Dark charcoal)
- Cards/Surfaces: `#18171D` (Elevated dark)
- Primary Text: `#FFFFFF` (Pure white)
- Secondary Text: `#A1A0AE` (Muted gray)
- Primary Accent: `#FFFFFF` (White)
- Success: `#38D9A9` (Green)
- Warning: `#FFB400` (Amber)

### Testing

Run tests with:
```bash
npm test
```

Includes tests for:
- Database setup detection
- Task deduplication
- Profile management
- Focus mode functionality
- Theme smoke tests
