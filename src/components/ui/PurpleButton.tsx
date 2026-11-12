import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PurpleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fullWidth?: boolean;
}

export function PurpleButton({ children, fullWidth = false, className = "", ...props }: PurpleButtonProps) {
  return <button className={`purple-button${fullWidth ? " button-full" : ""}${className ? ` ${className}` : ""}`} {...props}>{children}</button>;
}
