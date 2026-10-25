import * as React from "react";
import { Search, X } from "lucide-react";
import { Input, InputProps } from "./input";

export interface SearchInputProps extends Omit<InputProps, "leftIcon" | "rightIcon"> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, placeholder = "Search...", ...props }, ref) => {
    const hasValue = Boolean(value && String(value).length > 0);

    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        leftIcon={<Search className="w-4 h-4" />}
        rightIcon={
          hasValue ? (
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : undefined
        }
        {...props}
      />
    );
  }
);

SearchInput.displayName = "SearchInput";
