import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { useAccount } from "../../auth/components/AccountProvider";
import { useParticipant, } from "../../auth/utils/useParticipant";
import { saveParticipant } from "../../auth/utils/participant";
import { supabase } from "../../../lib/supabase/client";
import { fetchProfile, saveProfile } from "../services/profiles";
import { useUserSettings } from "../hooks/useUserSettings";

function limitNickname(value: string) {
  return Array.from(value).slice(0, 20).join("");
}

export function EditProfilePage() {
  const navigate = useNavigate();
  const { user, loading: accountLoading } = useAccount();
  const participant = useParticipant();
  const { settings, save } = useUserSettings();
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!accountLoading && !user && !participant) {
      navigate("/auth?returnTo=%2Fedit-profile", { replace: true });
      return;
    }
    let active = true;
    if (user) {
      void fetchProfile(user.id).then((profile) => {
        if (!active) return;
        const metadataNickname = typeof user.user_metadata.nickname === "string" ? user.user_metadata.nickname : "";
        setNickname(profile?.nickname || metadataNickname || user.email?.split("@")[0] || "");
        setBio(profile?.bio || "");
        setAvatar(profile?.avatar_url || (typeof user.user_metadata.avatar === "string" ? user.user_metadata.avatar : ""));
      }).catch((error) => {
        console.error("BothPls: could not load profile.", error);
        setFeedback("资料加载失败，请稍后重试。");
      });
    } else if (participant) {
      setNickname(participant.nickname);
      setBio(settings.bio || "");
      setAvatar(participant.avatar);
    }
    return () => { active = false; };
  }, [user, participant]);

  const uploadAvatar = async (file: File) => {
    setFeedback("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback("头像格式不支持，请重新选择 JPG、PNG 或 WebP 图片。");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback("头像不能超过 5 MB，请重新选择。");
      return;
    }
    try {
      if (!user) throw new Error("请先登录正式账号后再上传头像。");
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("poll-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const publicUrl = supabase.storage.from("poll-images").getPublicUrl(path).data.publicUrl;
      setAvatar(publicUrl);
    } catch (error) {
      console.error("BothPls: avatar upload failed.", error);
      setFeedback("头像上传失败，请重试。已填写的资料不会清空。");
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanNickname = nickname.trim();
    if (!cleanNickname) {
      setFeedback("昵称不能为空。");
      return;
    }
    if (Array.from(cleanNickname).length > 20) {
      setFeedback("昵称最多 20 个字符。");
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      if (user) {
        await saveProfile({
          id: user.id,
          nickname: cleanNickname,
          avatar_url: avatar || null,
          bio: bio.trim() || null,
        });
        const { error } = await supabase.auth.updateUser({
          data: { nickname: cleanNickname, avatar: avatar || "🌷" },
        });
        if (error) throw error;
      } else if (participant) {
        await saveParticipant(cleanNickname, avatar || participant.avatar);
        await save({ ...settings, nickname: cleanNickname, avatar: avatar || participant.avatar });
      } else {
        navigate("/auth?returnTo=%2Fedit-profile", { replace: true });
        return;
      }
      navigate("/settings", { replace: true });
    } catch (error) {
      console.error("BothPls: could not save profile.", error);
      setFeedback("资料保存失败，请重试。已填写的资料不会清空。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="编辑资料" showHeaderTitle backTo="/settings" showNavigation={false}>
      <form className="settings-card profile-form" onSubmit={submit}>
        <label className="field-label">头像</label>
        <div className="avatar-picker-row">
          {avatar && avatar.startsWith("http") ? (
            <img className="profile-avatar" src={avatar} alt="当前头像" />
          ) : (
            <div className="profile-avatar" aria-label={`当前头像 ${avatar || "🌷"}`}>{avatar || "🌷"}</div>
          )}
          <label className="button-soft" htmlFor="edit-profile-avatar">选择图片</label>
          <input
            id="edit-profile-avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadAvatar(file);
              event.target.value = "";
            }}
          />
        </div>
        <label className="field-label" htmlFor="edit-profile-nickname">昵称 <span className="optional">必填</span></label>
        <input
          id="edit-profile-nickname"
          className="text-input"
          value={nickname}
          maxLength={20}
          required
          placeholder="输入昵称"
          onChange={(event) => setNickname(limitNickname(event.target.value))}
        />
        <label className="field-label" htmlFor="edit-profile-bio">简介 <span className="optional">可选</span></label>
        <textarea
          id="edit-profile-bio"
          className="text-input profile-bio-input"
          value={bio}
          placeholder="简单介绍一下自己"
          onChange={(event) => setBio(event.target.value)}
        />
        {feedback && <p className="settings-feedback" role="alert">{feedback}</p>}
        <button className="purple-button button-full" type="submit" disabled={saving}>
          {saving ? "保存中…" : "保存资料"}
        </button>
      </form>
    </PageShell>
  );
}
