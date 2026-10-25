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
              onClick={() => onStepClick && isDone && onStepClick(idx)}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-[#077C74] text-white dark:bg-[#1BD1C0] dark:text-zinc-950 ring-4 ring-teal-50 dark:ring-teal-950/30"
                      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-0.5 h-8 my-1 ${
                      idx < activeStep
                        ? "bg-emerald-500"
                        : "bg-zinc-200 dark:bg-zinc-800"
                    }`}
                  />
                )}
              </div>
              <div className="pt-0.5">
                <div
                  className={`text-xs font-medium ${
                    isActive
                      ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                      : isDone
                      ? "text-zinc-700 dark:text-zinc-300"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {step.title}
                </div>
                {step.description && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
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
              onClick={() => onStepClick && isDone && onStepClick(idx)}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-emerald-500 text-white"
                    : isActive
                    ? "bg-[#077C74] text-white dark:bg-[#1BD1C0] dark:text-zinc-950 ring-4 ring-teal-100 dark:ring-teal-950/40"
                    : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium ${
                  isActive
                    ? "text-zinc-900 dark:text-zinc-100 font-semibold"
                    : isDone
                    ? "text-zinc-700 dark:text-zinc-300"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {step.title}
              </span>
            </div>

            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 -mt-5 ${
                  idx < activeStep
                    ? "bg-emerald-500"
                    : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
