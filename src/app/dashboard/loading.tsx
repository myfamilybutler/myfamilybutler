export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-muted rounded-xl animate-pulse" />
              <div className="w-32 h-5 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-muted rounded-full animate-pulse" />
              <div className="w-24 h-9 bg-muted rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
          {/* Today widget skeleton */}
          <div className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                  <div className="w-32 h-5 bg-muted rounded animate-pulse" />
                </div>
                <div className="w-20 h-7 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="h-12 bg-muted rounded animate-pulse" />
              <div className="h-12 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Calendar skeleton */}
          <div className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded animate-pulse" />
                <div className="w-8 h-8 bg-muted rounded animate-pulse" />
              </div>
              <div className="w-32 h-6 bg-muted rounded animate-pulse" />
              <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            </div>
            <div className="p-4 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={`d-${i}`} className="h-20 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          </div>

          {/* Upcoming events skeleton */}
          <div className="border-border shadow-sm bg-card rounded-xl overflow-hidden">
            <div className="p-4 border-b">
              <div className="w-40 h-5 bg-muted rounded animate-pulse" />
            </div>
            <div className="p-4 space-y-3">
              <div className="h-16 bg-muted rounded animate-pulse" />
              <div className="h-16 bg-muted rounded animate-pulse" />
              <div className="h-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
