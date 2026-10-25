import React from "react";
import { CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";

export interface TimelineEvent {
  id: string;
  title: string;
  timestamp?: string;
  description?: string;
  status: "completed" | "current" | "pending" | "failed";
  badge?: string;
}

export interface StatusTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function StatusTimeline({ events, className = "" }: StatusTimelineProps) {
  const getIcon = (status: TimelineEvent["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "current":
        return <Clock className="w-4 h-4 text-[#077C74] dark:text-[#1BD1C0] animate-pulse" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-rose-500" />;
      case "pending":
      default:
        return <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;

        return (
          <div key={event.id} className="relative flex items-start gap-3">
            {!isLast && (
              <span
                className="absolute left-[13px] top-6 -bottom-4 w-0.5 bg-zinc-200 dark:bg-zinc-800"
                aria-hidden="true"
              />
            )}

            <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shrink-0">
              {getIcon(event.status)}
            </div>

            <div className="flex-1 pt-0.5 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-semibold ${
                    event.status === "failed"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {event.title}
                </span>
                {event.timestamp && (
                  <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                    {event.timestamp}
                  </span>
                )}
              </div>

              {event.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {event.description}
                </p>
              )}

              {event.badge && (
                <div className="mt-1">
                  <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {event.badge}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
