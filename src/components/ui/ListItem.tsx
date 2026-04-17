import { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
};

export default function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  className = "",
  ...rest
}: Props) {
  return (
    <div
      className={`flex items-center gap-3 bg-surface rounded-xl px-3 py-2.5 ${className}`}
      {...rest}
    >
      {leading && (
        <div className="flex items-center justify-center text-primary">
          {leading}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted truncate">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="flex items-center">{trailing}</div>}
    </div>
  );
}
