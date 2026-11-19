import english from "../assets/apple-sign-in-en_US.png";
import korean from "../assets/apple-sign-in-ko_KR.png";
import simplified from "../assets/apple-sign-in-zh_CN.png";
import traditional from "../assets/apple-sign-in-zh_HK.png";
import "./AppleWebSignInButton.css";

const artwork = {
  "zh-CN": { image: simplified, label: "通过 Apple 登录" },
  "zh-HK": { image: traditional, label: "透過 Apple 登入" },
  en: { image: english, label: "Sign in with Apple" },
  "ko-KR": { image: korean, label: "Apple로 로그인" },
};

export function AppleWebSignInButton({ disabled, busy, onClick }: {
  disabled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const locale = document.documentElement.lang;
  const copy = artwork[locale as keyof typeof artwork] ?? artwork["zh-CN"];
  return (
    <button className="auth-apple-web button-full" type="button" aria-label={copy.label}
      aria-busy={busy} disabled={disabled} onClick={onClick}>
      <img src={copy.image} alt="" width="300" height="44" />
    </button>
  );
}
