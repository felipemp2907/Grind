# Grind - Your AI Assistant for Daily Discipline

Created by fmp

## Recent Updates

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

Run Edge deploy, then sign in to test Focus shortcut and new features.
