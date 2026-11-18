import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { getRandomNickname } from "../../polls/utils/voting";
import { PARTICIPANT_AVATARS, readParticipant, saveParticipant } from "../utils/participant";
import "./ParticipantLoginPage.css";

function DiceIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />{[[8,8],[16,8],[12,12],[8,16],[16,16]].map(([cx,cy]) => <circle key={cx + "-" + cy} cx={cx} cy={cy} r="1.4" fill="currentColor" />)}</svg>;
}

export function ParticipantGate({ children }: { children: ReactNode }) {
  const { id = "" } = useParams();
  const location = useLocation();
  if (!readParticipant()) {
    return <Navigate replace to={`/poll/${encodeURIComponent(id)}/join${location.search}${location.hash}`} />;
  }
  return <>{children}</>;
}

export function ParticipantLoginPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [saved] = useState(readParticipant);
  const [nickname, setNickname] = useState(saved?.nickname ?? "");
  const [avatarIndex, setAvatarIndex] = useState(() => Math.max(0, PARTICIPANT_AVATARS.findIndex(item => item === saved?.avatar)));
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const avatar = PARTICIPANT_AVATARS[avatarIndex];
  const target = id ? `/poll/${encodeURIComponent(id)}${location.search}${location.hash}` : "/";

  const randomNickname = () => {
    let next = getRandomNickname();
    if (next === nickname) next = next + "呀";
    setNickname(next);
    setError("");
    setAnnouncement(`已生成昵称：${next}`);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const length = Array.from(nickname.trim()).length;
    if (length < 2 || length > 12) {
      setError("请输入 2–12 个字符的昵称，也可以点击骰子随机生成。");
      return;
    }
    try {
      saveParticipant(nickname, avatar);
      navigate(target, { replace: true, state: location.state });
    } catch {
      setError("暂时无法保存身份，请允许浏览器存储后重试。");
    }
  };

  return (
    <main className="participant-page">
      <header className="participant-brand">
        <Link to="/" aria-label="BothPls 首页"><span className="participant-chat" aria-hidden="true"><i /><i /></span><strong>BothPls</strong></Link>
        <p>朋友帮选 · 一起投票</p>
      </header>
      <form className="participant-form" onSubmit={submit} noValidate>
        <section className="participant-ticket" aria-labelledby="participant-title">
          <h1 id="participant-title">以投票者身份登录</h1>
          <p className="participant-subtitle">输入一个临时身份参与投票</p>
          <div className="participant-avatar-row">
            <span className="participant-label">头像</span>
            <div className="participant-avatar" role="img" aria-label={`当前头像：${avatar}`} key={avatar}><span>{avatar}</span><b aria-hidden="true">✦</b></div>
            <button className="participant-dice" type="button" onClick={() => { setAvatarIndex(current => (current + 1 + Math.floor(Math.random() * (PARTICIPANT_AVATARS.length - 1))) % PARTICIPANT_AVATARS.length); setAnnouncement("已更换随机头像"); }}><DiceIcon /><span>随机头像</span></button>
          </div>
          <label className="participant-label" htmlFor="participant-nickname">昵称</label>
          <div className="participant-nickname-row">
            <div className="participant-input-wrap"><svg width="21" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M4 22v-3a8 8 0 0 1 16 0v3" stroke="currentColor" strokeWidth="1.6"/></svg><input id="participant-nickname" value={nickname} onChange={event => { setNickname(event.target.value); setError(""); }} placeholder="输入昵称（2–12 个字符）" autoComplete="nickname" required aria-invalid={!!error} aria-describedby={error ? "participant-error participant-hint" : "participant-hint"} /></div>
            <button className="participant-dice" type="button" onClick={randomNickname}><DiceIcon /><span>随机昵称</span></button>
          </div>
          {error && <p id="participant-error" className="participant-error" role="alert">{error}</p>}
        </section>
        <button className="participant-submit" type="submit">登录并参与</button>
        <p className="participant-hint" id="participant-hint">无需注册 · 昵称和头像会保存在当前浏览器</p>
        <span className="participant-sr-only" role="status" aria-live="polite">{announcement}</span>
      </form>
      <div className="participant-landscape" aria-hidden="true"><i /><i /><div /></div>
    </main>
  );
}
