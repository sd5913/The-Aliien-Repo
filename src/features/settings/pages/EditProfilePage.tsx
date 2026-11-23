import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "../../../i18n/LocaleProvider";
import { PageShell } from "../../../components/layout/PageShell";
import { useAccount } from "../../auth/components/AccountProvider";
import { supabase } from "../../../lib/supabase/client";
import { saveProfile } from "../services/profiles";
import { displayAvatar, loadProfileDraft } from "../utils/profile";

function limitNickname(value: string) {
  return Array.from(value).slice(0, 20).join("");
}

export function EditProfilePage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { user, loading: accountLoading } = useAccount();
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!accountLoading && !user) {
      navigate("/auth?returnTo=%2Fedit-profile", { replace: true });
      return;
    }
    if (!user) return;
    let active = true;
    void loadProfileDraft(user).then((draft) => {
      if (!active) return;
      setNickname(limitNickname(draft.nickname));
      setBio(draft.bio);
      setAvatar(draft.avatar);
    });
    return () => { active = false; };
  }, [user, accountLoading, navigate]);

  const uploadAvatar = async (file: File) => {
    setFeedback("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback(t("image.format"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback(t("profile.avatarTooLarge"));
      return;
    }
    try {
      if (!user) throw new Error(t("profile.avatarAccountRequired"));
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("poll-images").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const publicUrl = supabase.storage.from("poll-images").getPublicUrl(path).data.publicUrl;
      setAvatar(publicUrl);
    } catch (error) {
      console.error("BothPls: avatar upload failed.", error);
      setFeedback(t("image.uploadFailed"));
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanNickname = nickname.trim();
    if (Array.from(cleanNickname).length < 2) {
      setFeedback(t("profile.nicknameRequired"));
      return;
    }
    if (Array.from(cleanNickname).length > 20) {
      setFeedback(t("profile.nicknameTooLong", { count: 20 }));
      return;
    }
    setSaving(true);
    setFeedback("");
    try {
      if (!user) {
        navigate("/auth?returnTo=%2Fedit-profile", { replace: true });
        return;
      }
      const avatarValue = avatar.trim();
      const bioValue = bio.trim();
      // Account metadata is the display source, so it is written first and is authoritative.
      const { error } = await supabase.auth.updateUser({
        data: { nickname: cleanNickname, avatar: displayAvatar(avatarValue), bio: bioValue },
      });
      if (error) throw error;
      // The profiles table is a mirror only; a missing table must not block the save.
      await saveProfile({
        id: user.id,
        nickname: cleanNickname,
        avatar_url: avatarValue || null,
        bio: bioValue || null,
      }).catch((mirrorError) => {
        console.warn("BothPls: could not mirror the profile into the profiles table.", mirrorError);
        return false;
      });
      navigate("/settings", { replace: true });
    } catch (error) {
      console.error("BothPls: could not save profile.", error);
      setFeedback(t("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title={t("profile.edit")} showHeaderTitle backTo="/settings" showNavigation={false}>
      <form className="settings-card profile-form" onSubmit={submit}>
        <label className="field-label">{t("guest.avatar")}</label>
        <div className="avatar-picker-row">
          {avatar.startsWith("http") ? (
            <img className="profile-avatar" src={avatar} alt={t("profile.currentAvatar", { avatar })} />
          ) : (
            <div className="profile-avatar" aria-label={t("profile.currentAvatar", { avatar: displayAvatar(avatar) })}>{displayAvatar(avatar)}</div>
          )}
          <label className="button-soft" htmlFor="edit-profile-avatar">{t("profile.chooseAvatar")}</label>
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
        <label className="field-label" htmlFor="edit-profile-nickname">{t("common.nickname")} <span className="optional">{t("profile.required")}</span></label>
        <input
          id="edit-profile-nickname"
          className="text-input"
          value={nickname}
          required
          placeholder={t("profile.nicknameHint")}
          onChange={(event) => setNickname(limitNickname(event.target.value))}
        />
        <label className="field-label" htmlFor="edit-profile-bio">{t("profile.bio")} <span className="optional">{t("common.optional")}</span></label>
        <textarea
          id="edit-profile-bio"
          className="text-input profile-bio-input"
          value={bio}
          placeholder={t("profile.bioHint")}
          onChange={(event) => setBio(event.target.value)}
        />
        {feedback && <p className="settings-feedback" role="alert">{feedback}</p>}
        <button className="purple-button button-full" type="submit" disabled={saving}>
          {saving ? t("common.saving") : t("profile.save")}
        </button>
      </form>
    </PageShell>
  );
}
