export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div
        role="status"
        aria-label="Restoring your session"
        className="h-8 w-8 animate-spin rounded-full border-2 border-line-strong border-t-ink"
      />
    </div>
  );
}
