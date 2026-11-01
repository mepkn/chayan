import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ListDoc } from "@/lib/types";

export function ListCard({ list }: { list: ListDoc }) {
  const itemCount = list.itemCount ?? 0;
  const selectedCount = list.selectedThisRound ?? 0;
  const progressPercent = itemCount > 0 ? Math.min(100, Math.round((selectedCount / itemCount) * 100)) : 0;

  return (
    <Link to={`/lists/${list.slug}`} className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-ring">
      <Card className="cyber-glass h-full rounded-2xl border-slate-800/80 py-5 transition-all duration-300 group-hover:border-cyan-500/50 group-hover:shadow-[0_8px_30px_rgba(0,240,255,0.12)] sm:py-6">
        <CardHeader className="px-5 sm:px-6">
          <CardTitle className="line-clamp-1 text-xl font-bold tracking-tight text-white transition-colors group-hover:text-cyan-300">
            {list.name}
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </CardDescription>
        </CardHeader>
        {list.selectionMode !== "allow_repetition" && (
          <CardContent className="space-y-1.5 px-5 sm:px-6">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-muted-foreground">Round {list.currentRound || 1} Progress</span>
              <span className="font-semibold text-cyan-300">
                {selectedCount} / {itemCount}
              </span>
            </div>
            <Progress value={progressPercent} aria-label={`Round progress ${progressPercent}%`} className="chayan-progress" />
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
