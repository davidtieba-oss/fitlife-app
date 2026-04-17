import { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
};

export default function Card({
  title,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <div
      className={`bg-surface rounded-2xl p-4 ${className}`}
      {...rest}
    >
      {title != null && (
        <p className="text-xs text-muted font-medium mb-1">{title}</p>
      )}
      {children}
    </div>
  );
}
