export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div
        role="status"
        aria-label="Restoring your session"
        className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600"
      />
    </div>
  );
}
