import type { appleAuthCopy } from "./appleAuthCopy";
import "./AppleSignInButton.css";

export function AppleSignInButton({ copy, disabled, busy, onClick }: {
  copy: ReturnType<typeof appleAuthCopy>;
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button className="auth-apple button-full" type="button" aria-label={copy.signIn}
      aria-busy={busy} disabled={disabled} onClick={onClick}>
      <img src={copy.image} alt="" width="300" height="44" />
    </button>
  );
}
