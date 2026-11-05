import React from "react";
import { Check } from "lucide-react";

export interface StepItem {
  id: string | number;
  title: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  activeStep: number; // 0-indexed
  onStepClick?: (stepIndex: number) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Stepper({
  steps,
  activeStep,
  onStepClick,
  orientation = "horizontal",
  className = "",
}: StepperProps) {
  if (orientation === "vertical") {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, idx) => {
          const isDone = idx < activeStep;
          const isActive = idx === activeStep;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 group ${
                onStepClick && isDone ? "cursor-pointer" : ""
              }`}
              role={onStepClick && isDone ? "button" : undefined}
              tabIndex={onStepClick && isDone ? 0 : undefined}
              aria-current={isActive ? "step" : undefined}
              onKeyDown={e => { if (onStepClick && isDone && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onStepClick(idx); } }}
              onClick={() => onStepClick && isDone && onStepClick(idx)}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isDone
                      ? "bg-brand text-white"
                      : isActive
                      ? "bg-brand text-white dark:bg-brand dark:text-on-brand ring-4 ring-accent dark:ring-accent/30"
                      : "bg-surface text-muted dark:bg-surface-muted dark:text-muted"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-0.5 h-8 my-1 ${
                      idx < activeStep
                        ? "bg-brand"
                        : "bg-surface-muted dark:bg-surface-muted"
                    }`}
                  />
                )}
              </div>
              <div className="pt-0.5">
                <div
                  className={`text-xs font-medium ${
                    isActive
                      ? "text-ink dark:text-ink font-semibold"
                      : isDone
                      ? "text-ink dark:text-ink"
                      : "text-muted dark:text-muted"
                  }`}
                >
                  {step.title}
                </div>
                {step.description && (
                  <p className="text-[11px] text-muted dark:text-muted mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal
  return (
    <div className={`flex items-center justify-between w-full ${className}`}>
      {steps.map((step, idx) => {
        const isDone = idx < activeStep;
        const isActive = idx === activeStep;

        return (
          <React.Fragment key={step.id}>
            <div
              className={`flex flex-col items-center text-center ${
                onStepClick && isDone ? "cursor-pointer" : ""
              }`}
              role={onStepClick && isDone ? "button" : undefined}
              tabIndex={onStepClick && isDone ? 0 : undefined}
              aria-current={isActive ? "step" : undefined}
              onKeyDown={e => { if (onStepClick && isDone && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onStepClick(idx); } }}
              onClick={() => onStepClick && isDone && onStepClick(idx)}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-brand text-white"
                    : isActive
                    ? "bg-brand text-white dark:bg-brand dark:text-on-brand ring-4 ring-accent dark:ring-accent/40"
                    : "bg-surface text-muted dark:bg-surface-muted dark:text-muted"
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium ${
                  isActive
                    ? "text-ink dark:text-ink font-semibold"
                    : isDone
                    ? "text-ink dark:text-ink"
                    : "text-muted dark:text-muted"
                }`}
              >
                {step.title}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 -mt-5 ${
                  idx < activeStep
                    ? "bg-brand"
                    : "bg-surface-muted dark:bg-surface-muted"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
