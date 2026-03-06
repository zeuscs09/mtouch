export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-8 ${className ?? ""}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" />
        <p className="text-sm text-muted-foreground">กำลังโหลด...</p>
      </div>
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center space-y-2">
        <p className="text-sm text-destructive">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-sm text-primary hover:underline">
            ลองอีกครั้ง
          </button>
        )}
      </div>
    </div>
  );
}
