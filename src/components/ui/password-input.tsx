import * as React from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input, InputProps } from "./input";

export interface PasswordInputProps extends Omit<InputProps, "type" | "rightIcon"> {
  showStrengthMeter?: boolean;
}

export function calculatePasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "None", color: "bg-surface-muted dark:bg-surface-muted" };
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-danger" };
  if (score === 3) return { score: 2, label: "Fair", color: "bg-warning" };
  if (score === 4) return { score: 3, label: "Good", color: "bg-brand" };
  return { score: 4, label: "Strong", color: "bg-brand" };
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
              disabled={props.disabled}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((prev) => !prev)}
              className="p-1 rounded text-muted hover:text-ink dark:hover:text-on-ink transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
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
                    strength.score >= step ? strength.color : "bg-surface-muted dark:bg-surface-muted"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-muted">
              <span>Security strength: {strength.label}</span>
              {strength.score < 3 && <span>Use 10+ chars, numbers &amp; symbols</span>}
            </div>
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
