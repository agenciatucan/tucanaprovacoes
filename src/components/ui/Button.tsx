import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary:   "bg-[#eb6013] text-white hover:bg-[#d4551a] focus-visible:ring-[#eb6013]",
  secondary: "bg-[#25411e] text-white hover:bg-[#1d3317] focus-visible:ring-[#25411e]",
  ghost:     "bg-transparent text-[#1f1f1f] hover:bg-gray-100",
  danger:    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  outline:   "border border-gray-200 text-[#1f1f1f] hover:bg-gray-50",
};

const SIZE_CLASS: Record<Size, string> = {
  sm:  "px-3 py-1.5 text-sm rounded-lg",
  md:  "px-4 py-2 text-sm rounded-xl",
  lg:  "px-6 py-3 text-base rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
          </svg>
          Aguarde…
        </span>
      ) : children}
    </button>
  )
);
Button.displayName = "Button";
