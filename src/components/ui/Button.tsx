import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-muted active:scale-[0.98]",
  secondary:
    "bg-surface-muted text-foreground hover:bg-surface active:scale-[0.98]",
  ghost:
    "bg-transparent text-foreground hover:bg-surface-muted active:scale-[0.98]",
  danger:
    "bg-danger text-white hover:opacity-90 active:scale-[0.98]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs rounded-lg gap-1",
  md: "px-3 py-2.5 text-sm rounded-xl gap-1.5",
};

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center font-medium transition disabled:opacity-50 disabled:pointer-events-none ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
