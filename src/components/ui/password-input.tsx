import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input, InputProps } from "./input";

export interface PasswordInputProps extends Omit<InputProps, "type" | "rightIcon"> {
  showStrengthMeter?: boolean;
}

export function calculatePasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "None", color: "bg-zinc-200 dark:bg-zinc-700" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-red-500" };
  if (score === 3) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score === 4) return { score: 3, label: "Good", color: "bg-teal-600" };
  return { score: 4, label: "Strong", color: "bg-emerald-500" };
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrengthMeter = false, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const passwordStr = typeof value === "string" ? value : "";
    const strength = React.useMemo(() => calculatePasswordStrength(passwordStr), [passwordStr]);

    return (
      <div className="space-y-1.5 w-full">
        <Input
          ref={ref}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-teal-500"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          {...props}
        />

        {showStrengthMeter && passwordStr.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex gap-1.5 h-1 w-full">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`h-full flex-1 rounded-full transition-colors ${
                    strength.score >= step ? strength.color : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
              <span>Security strength: {strength.label}</span>
              {strength.score < 3 && <span>Use 8+ chars, numbers &amp; symbols</span>}
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
