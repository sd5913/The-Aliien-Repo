import simplified from "../assets/apple-sign-in-zh_CN.png";
import traditional from "../assets/apple-sign-in-zh_HK.png";
import english from "../assets/apple-sign-in-en_US.png";
import korean from "../assets/apple-sign-in-ko_KR.png";

const messages = {
  "zh-CN": {
    image: simplified,
    signIn: "使用 Apple 登录",
    failed: "无法使用 Apple 登录，请稍后重试。",
    iosIntro: "使用 Apple 登录，继续和朋友一起做决定。",
    browserLink: "在浏览器中使用邮箱或 GitHub",
    browserNote: "浏览器登录会留在浏览器中。参与朋友投票无需登录。",
  },
  "zh-HK": {
    image: traditional,
    signIn: "使用 Apple 登入",
    failed: "無法使用 Apple 登入，請稍後再試。",
    iosIntro: "使用 Apple 登入，繼續和朋友一起作決定。",
    browserLink: "在瀏覽器中使用電郵或 GitHub",
    browserNote: "瀏覽器登入會留在瀏覽器中。參與朋友投票毋須登入。",
  },
  en: {
    image: english,
    signIn: "Sign in with Apple",
    failed: "Apple sign-in failed. Please try again.",
    iosIntro: "Sign in with Apple to keep making decisions with friends.",
    browserLink: "Use email or GitHub in your browser",
    browserNote: "Your browser session stays in your browser. You can vote in a friend's poll without signing in.",
  },
  "ko-KR": {
    image: korean,
    signIn: "Apple로 로그인",
    failed: "Apple로 로그인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    iosIntro: "Apple로 로그인하고 친구들과 함께 결정하세요.",
    browserLink: "브라우저에서 이메일 또는 GitHub 사용",
    browserNote: "브라우저에서만 로그인 상태가 유지됩니다. 친구의 투표에는 로그인 없이 참여할 수 있습니다.",
  },
};

export function appleAuthCopy(locale: string) {
  return messages[locale as keyof typeof messages] ?? messages["zh-CN"];
}
