# Analytics Components

This directory contains all React components for the EduNexus Advanced Analytics system.

## Components

### Core Components

#### `analytics-dashboard.tsx`
Main analytics dashboard component that integrates all analytics features.

**Usage:**
```tsx
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard';

<AnalyticsDashboard userId="user_123" />
```

**Features:**
- Key metrics cards
- Period selection (week/month)
- Learning trends visualization
- AI insights panel
- Export and share functionality

#### `ai-insights-panel.tsx`
AI-powered insights panel displaying patterns, recommendations, predictions, and anomalies.

**Usage:**
```tsx
import { AIInsightsPanel } from '@/components/analytics/ai-insights-panel';

<AIInsightsPanel insights={insights} loading={false} />
```

**Features:**
- Learning pattern discovery
- Personalized recommendations
- Predictive analysis
- Anomaly detection
- Comparison analysis

#### `learning-chart.tsx`
Comprehensive learning trends visualization with multiple chart types.

**Features:**
- Line chart for study time trends
- Bar chart for activity frequency
- Radar chart for knowledge mastery
- Pie chart for category distribution
- Quiz statistics

#### `activity-heatmap.tsx`
Time-based heatmap showing learning activity intensity.

**Features:**
- Date and hour-based visualization
- Color intensity based on activity
- Pattern recognition
- Interactive tooltips

### Report Components

#### `weekly-report.tsx`
Weekly learning report component.

**Features:**
- Weekly summary statistics
- Daily breakdown
- Top activities
- Achievements and insights
- Suggestions for improvement

#### `monthly-report.tsx`
Monthly learning report component.

**Features:**
- Monthly summary statistics
- Weekly trends
- Knowledge mastery progress
- Milestones and achievements
- Recommendations

#### `ai-suggestions.tsx`
AI-generated suggestions component.

**Features:**
- Personalized learning suggestions
- Priority-based recommendations
- Action items
- Expected impact

## Component Architecture

```
AnalyticsDashboard
├── Period Selector
├── Key Metrics Cards
│   ├── Study Time Card
│   ├── Focus Score Card
│   ├── Habit Card
│   └── Knowledge Card
├── Charts Section
│   ├── LearningChart
│   └── ActivityHeatmap
└── AIInsightsPanel
    ├── Patterns Tab
    ├── Recommendations Tab
    ├── Predictions Tab
    └── Anomalies Tab
```

## Data Flow

```
API Request → Analytics Engine → Data Aggregation → Component Rendering
```

## Styling

All components use:
- Tailwind CSS for styling
- shadcn/ui components
- Recharts for data visualization
- Lucide React for icons

## Performance Considerations

- Lazy loading for heavy components
- Memoization for expensive calculations
- Virtualization for large datasets
- Debounced API calls

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support

## Testing

Components can be tested using:
- React Testing Library
- Vitest
- Mock data from `usage-examples.ts`

## Related Documentation

- [Advanced Analytics Documentation](../../../docs/ADVANCED_ANALYTICS.md)
- [Analytics API Documentation](../../app/api/analytics/README.md)
- [Analytics Library Documentation](../../lib/analytics/README.md)
