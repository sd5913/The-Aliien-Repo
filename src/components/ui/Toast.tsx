import { useEffect } from "react";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  return <div className="toast-message" role="status">✦ {message}</div>;
}
