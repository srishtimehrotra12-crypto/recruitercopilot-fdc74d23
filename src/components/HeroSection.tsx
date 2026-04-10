import { Zap, Users, Shield, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Screening",
    description: "Screen dozens of resumes in seconds, not hours",
  },
  {
    icon: Users,
    title: "Fair Ranking",
    description: "AI evaluates skills objectively against your job description",
  },
  {
    icon: Shield,
    title: "No Signup Required",
    description: "Recruiters just open the link and start screening",
  },
  {
    icon: BarChart3,
    title: "Detailed Scores",
    description: "Get match scores, strengths, and gaps for every candidate",
  },
];

export function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="hero-gradient py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center">
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/20 text-primary-foreground text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            AI-Powered Recruiting
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight mb-4">
            RecruiterCopilot
          </h1>
          <p className="text-lg sm:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-8">
            Screen and rank candidates against any job description in seconds.
            Paste resumes, get instant AI-powered insights.
          </p>
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary-foreground text-primary rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          >
            Start Screening
            <BarChart3 className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 animate-slide-up">
          {features.map((f) => (
            <div key={f.title} className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4 text-left">
              <f.icon className="w-6 h-6 text-primary-foreground mb-2" />
              <h3 className="font-semibold text-primary-foreground text-sm">{f.title}</h3>
              <p className="text-primary-foreground/75 text-xs mt-1">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
