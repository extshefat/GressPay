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
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "current":
        return <Clock className="w-4 h-4 text-accent dark:text-accent " />;
      case "failed":
        return <XCircle className="w-4 h-4 text-danger" />;
      case "pending":
      default:
        return <span className="w-2 h-2 rounded-full bg-surface-muted dark:bg-surface-muted" />;
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
                className="absolute left-[13px] top-6 -bottom-4 w-0.5 bg-surface-muted dark:bg-surface-muted"
                aria-hidden="true"
              />
            )}

            <div className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-canvas border border-border dark:border-border shrink-0">
              {getIcon(event.status)}
            </div>

            <div className="flex-1 pt-0.5 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-semibold ${
                    event.status === "failed"
                      ? "text-danger dark:text-danger"
                      : "text-ink dark:text-ink"
                  }`}
                >
                  {event.title}
                </span>
                {event.timestamp && (
                  <span className="text-[11px] font-mono text-muted shrink-0">
                    {event.timestamp}
                  </span>
                )}
              </div>

              {event.description && (
                <p className="text-xs text-muted dark:text-muted mt-0.5 leading-relaxed">
                  {event.description}
                </p>
              )}

              {event.badge && (
                <div className="mt-1">
                  <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-surface dark:bg-surface-muted text-muted dark:text-muted">
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
