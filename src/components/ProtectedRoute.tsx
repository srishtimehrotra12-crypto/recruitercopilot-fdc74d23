import { useAuth } from "@/hooks/useAuth";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  if (loading || !session) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }
  return <>{children}</>;
}
