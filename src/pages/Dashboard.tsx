import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, KanbanSquare, ScanSearch, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const stats = [
  { label: "Open jobs", value: 0, icon: Briefcase, href: "/jobs" },
  { label: "Candidates", value: 0, icon: Users, href: "/talent" },
  { label: "In pipeline", value: 0, icon: KanbanSquare, href: "/pipeline" },
  { label: "Screenings run", value: 0, icon: ScanSearch, href: "/screening" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {name}</h1>
        <p className="text-sm text-muted-foreground">
          Your AI-powered recruitment command center. Source, screen, and track talent in one place.
        </p>
      </header>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link to={s.href} key={s.label}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-semibold leading-none">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Get started</CardTitle>
            <CardDescription>Run AI screening on a batch of resumes against a job description.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/screening">
                Start a screening <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coming next</CardTitle>
            <CardDescription>
              Jobs, ATS Pipeline, Talent Database, Sourcing, Analytics — rolling out in upcoming phases.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
