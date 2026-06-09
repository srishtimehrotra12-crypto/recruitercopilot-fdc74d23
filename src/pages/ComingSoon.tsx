import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>
      <Card>
        <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Construction className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">Shipping in an upcoming phase</div>
            <div className="text-sm text-muted-foreground mt-1">
              This module is part of the Command Center roadmap.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
