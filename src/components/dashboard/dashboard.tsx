/**
 * Dashboard Component
 *
 * A comprehensive dashboard component providing an overview of user's notes,
 * statistics, quick actions, and recent activity.
 *
 * Features:
 * - Statistics overview with charts
 * - Quick actions for common tasks
 * - Recent notes display
 * - Search functionality
 * - Activity timeline
 * - Popular tags
 * - Responsive design
 * - Full accessibility support
 *
 * Reference: specs/003-ui-ux/contracts/ui-components.md
 */

import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NoteList } from '@/components/note/note-list-new';
import { SearchBar } from '@/components/search/search-bar';
import { BaseChart, SimpleBarChart } from '@/components/charts/base-chart';
import { cn } from '@/lib/utils';

// Types
export interface DashboardStats {
  totalNotes: number;
  recentNotes: number;
  totalTags: number;
  storageUsed: string;
  storageLimit: string;
  popularTags: string[];
  quickStats: {
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
}

export interface ActivityItem {
  id: string;
  action: 'created' | 'updated' | 'deleted' | 'shared';
  target: string;
  timestamp: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardProps {
  className?: string;
  userName?: string;
  stats?: DashboardStats;
  recentNotes?: Note[];
  activity?: ActivityItem[];
  loading?: boolean;
  notesLoading?: boolean;
  onCreateNote?: () => void;
  onSearch?: (query: string) => void;
  onNoteClick?: (note: Note) => void;
  onNoteEdit?: (note: Note) => void;
  onNoteDelete?: (note: Note) => void;
  onImport?: () => void;
  onExport?: () => void;
  onViewAllNotes?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  className,
  userName = 'User',
  stats,
  recentNotes = [],
  activity = [],
  loading = false,
  notesLoading = false,
  onCreateNote,
  onSearch,
  onNoteClick,
  onNoteEdit,
  onNoteDelete,
  onImport,
  onExport,
  onViewAllNotes
}) => {
  // State
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarCollapsed(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate storage percentage
  const storagePercentage = useMemo(() => {
    if (!stats) return 0;
    const usedGB = parseFloat(stats.storageUsed.replace(/[^0-9.]/g, ''));
    const limitGB = parseFloat(stats.storageLimit.replace(/[^0-9.]/g, ''));
    return Math.round((usedGB / limitGB) * 100);
  }, [stats]);

  // Format timestamp
  const formatTimestamp = useCallback((date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }, []);

  // Format action text
  const formatAction = useCallback((action: string) => {
    switch (action) {
      case 'created': return 'Created';
      case 'updated': return 'Updated';
      case 'deleted': return 'Deleted';
      case 'shared': return 'Shared';
      default: return action;
    }
  }, []);

  // Get action icon
  const getActionIcon = useCallback((action: string) => {
    switch (action) {
      case 'created': return '📝';
      case 'updated': return '✏️';
      case 'deleted': return '🗑️';
      case 'shared': return '🔗';
      default: return '📄';
    }
  }, []);

  // Loading skeleton component
  const SkeletonCard = () => (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-4 bg-muted rounded w-3/4"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-full"></div>
          <div className="h-3 bg-muted rounded w-5/6"></div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div
      data-testid="dashboard"
      className={cn(
        'min-h-screen bg-background',
        isMobile && 'mobile-layout',
        className
      )}
    >
      <div className={cn('flex', isMobile && 'flex-col')}>
        {/* Main Content */}
        <div className="flex-1 space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {userName}!
              </p>
            </div>

            {/* Quick Actions */}
            <div className={cn('flex gap-2', isMobile && 'mobile-layout flex-wrap')}>
              <Button onClick={onCreateNote} data-testid="create-note-button">
                ✨ Create Note
              </Button>
              <Button variant="outline" onClick={onImport}>
                📥 Import
              </Button>
              <Button variant="outline" onClick={onExport}>
                📤 Export
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl">
            <SearchBar onSearch={onSearch} />
          </div>

          {/* Statistics Overview */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Total Notes
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalNotes}</div>
                  <p className="text-xs text-muted-foreground">
                    +{stats.quickStats.thisWeek} this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Recent Notes
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.recentNotes}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.quickStats.thisMonth} this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Total Tags
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTags}</div>
                  <p className="text-xs text-muted-foreground">
                    Active tags
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Storage Used
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{storagePercentage}%</div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${storagePercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.storageUsed} of {stats.storageLimit}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Notes */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Recent Notes</h2>
                    {onViewAllNotes && recentNotes.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={onViewAllNotes}>
                        View All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {notesLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <SkeletonCard key={i} />
                      ))}
                    </div>
                  ) : recentNotes.length > 0 ? (
                    <NoteList
                      notes={recentNotes}
                      onNoteClick={onNoteClick}
                      onNoteEdit={onNoteEdit}
                      onNoteDelete={onNoteDelete}
                      viewMode="compact"
                    />
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">📝</div>
                      <h3 className="text-lg font-semibold mb-2">No Notes Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first note to get started
                      </p>
                      {onCreateNote && (
                        <Button onClick={onCreateNote}>
                          Create Your First Note
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Timeline */}
              {activity.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">Recent Activity</h2>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {activity.slice(0, 10).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="text-2xl">
                            {getActionIcon(item.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{formatAction(item.action)}</span>
                              {' '}
                              <span className="text-muted-foreground">{item.target}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimestamp(item.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Popular Tags */}
              {stats?.popularTags && stats.popularTags.length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">Popular Tags</h2>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {stats.popularTags.slice(0, 10).map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats */}
              {stats?.quickStats && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">Activity</h2>
                  </CardHeader>
                  <CardContent>
                    {/* Activity Chart */}
                    <div className="mb-4">
                      <SimpleBarChart
                        data={[
                          { label: 'Last Month', value: stats.quickStats.lastMonth, color: '#94a3b8' },
                          { label: 'This Month', value: stats.quickStats.thisMonth, color: '#3b82f6' },
                          { label: 'This Week', value: stats.quickStats.thisWeek, color: '#10b981' }
                        ]}
                        orientation="vertical"
                        showValues={true}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">This Week</span>
                        <span className="font-medium">{stats.quickStats.thisWeek}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">This Month</span>
                        <span className="font-medium">{stats.quickStats.thisMonth}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Month</span>
                        <span className="font-medium">{stats.quickStats.lastMonth}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {loading && 'Loading statistics...'}
        {notesLoading && 'Loading notes...'}
        {!loading && !notesLoading && 'Dashboard loaded successfully'}
      </div>
    </div>
  );
};

Dashboard.displayName = 'Dashboard';

export { Dashboard };