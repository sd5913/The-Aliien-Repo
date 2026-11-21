import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { readDraft, saveDraft, clearDraft, isCreateDraft } from "../utils/drafts";
import { OptionImageInput } from "../components/OptionImageInput";
import { useAccount } from "../../auth/components/AccountProvider";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { PurpleButton } from "../../../components/ui/PurpleButton";
import { usePolls } from "../hooks/usePolls";
import { isPollOwner, isPollOpen } from "../utils/voting";
import type { Poll, PollOption } from "../../../types/poll";

function makeOption(): PollOption {
  return {
    id: crypto.randomUUID(),
    name: "",
  };
}

export function CreatePollPage() {
  const { t, number } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingId = params.get("id");
  const copyId = params.get("copy");
  const initialized = useRef("");
  const [newPollId, setNewPollId] = useState<string>(() => crypto.randomUUID());
  const [uploadCount, setUploadCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const { polls, loading, error: pollsError, savePoll } = usePolls({ pollId: editingId ?? copyId, metadataOnly: true });
  const { user } = useAccount();
  const draftKey = `bothpls:draft:create:${user?.id ?? "none"}:${editingId || copyId || "new"}`;
  const [draftReady, setDraftReady] = useState("");
  const [draftNotice, setDraftNotice] = useState<MessageKey | "">("");
  const editingPoll = polls.find((poll) => poll.id === editingId);
  const copySource = polls.find((poll) => poll.id === copyId);
  const canCopy = !copyId || Boolean(copySource && isPollOwner(copySource, user?.id ?? ""));
  const canEdit = !editingId || Boolean(editingPoll && isPollOwner(editingPoll, user?.id ?? "") && isPollOpen(editingPoll));
  const [title, setTitle] = useState(editingPoll?.title ?? "");
  const [description, setDescription] = useState(
    editingPoll?.description ?? "",
  );

  const [deadline, setDeadline] = useState("none");
  const [isPublic, setIsPublic] = useState(false);
  const [options, setOptions] = useState<PollOption[]>(
    editingPoll?.options ?? [makeOption(), makeOption()],
  );
  const [error, setError] = useState<MessageKey | "">("");

  useEffect(() => {
    const key = draftKey;
    if (initialized.current === key) return;
    const source = editingId ? editingPoll : copySource;
    if ((editingId || copyId) && !source) return;
    initialized.current = key;
    const saved = readDraft(draftKey, isCreateDraft);
    if (saved) {
      setTitle(saved.title); setDescription(saved.description); setOptions(saved.options);
      setDeadline(saved.deadline); setIsPublic(saved.isPublic ?? (editingId ? Boolean(source?.isPublic) : false)); setNewPollId(saved.pollId); setDraftNotice("poll.restored");
    } else if (source) {
      setTitle(source.title); setDescription(source.description);
      setOptions(editingId ? source.options : source.options.map((option) => ({ ...option, id: crypto.randomUUID() })));
      setDeadline(editingId && source.endsAt ? "custom" : "none");
      setIsPublic(editingId ? Boolean(source.isPublic) : false);
    }
    setDraftReady(draftKey);
  }, [editingId, copyId, editingPoll, copySource, draftKey]);

  useEffect(() => {
    if (draftReady !== draftKey || loading || !user) return;
    if (!saveDraft(draftKey, { pollId: newPollId, title, description, deadline, isPublic, options })) setDraftNotice("poll.draftUnavailable");
  }, [draftReady, draftKey, loading, user, newPollId, title, description, deadline, isPublic, options]);

  if (loading)
    return <PageShell showNavigation={false} backTo="/" title={t("poll.create")} showHeaderTitle><p className="empty-inline">{t("poll.loading")}</p></PageShell>;

  if (pollsError)
    return <PageShell showNavigation={false} backTo="/" title={t("poll.create")} showHeaderTitle><p className="settings-feedback" role="alert">{t("poll.loadFailed")}</p></PageShell>;

  if (!canEdit || !canCopy)
    return (
      <PageShell
        showNavigation={false}
        backTo={editingPoll ? `/poll/${editingPoll.id}` : "/"}
        title={t("poll.edit")}
        showHeaderTitle
      >
        <div className="empty-state">
          <h2>{t("poll.editUnavailable")}</h2>
          <p>{editingPoll && !isPollOpen(editingPoll) ? t("poll.closedEdit") : t("poll.ownerEdit")}</p>
          <Link
            className="purple-button"
            to={editingPoll ? `/poll/${editingPoll.id}` : "/"}
          >
            {t("poll.backToPoll")}
          </Link>
        </div>
      </PageShell>
    );

  const updateOption = (id: string, name: string) =>
    setOptions((current) =>
      current.map((option) =>
        option.id === id ? { ...option, name } : option,
      ),
    );
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit || !canCopy || !user || saving || uploadCount > 0) return;
    const cleanOptions = options.map((option, index) => ({
      ...option,
      name: option.name.trim() || String.fromCharCode(65 + index),
    }));
    if (!title.trim()) {
      setError("poll.titleRequired");
      return;
    }
    const endsAt =
      deadline === "none"
        ? undefined
        : deadline === "custom"
          ? editingPoll?.endsAt
          : new Date(
              Date.now() + Number(deadline) * 60 * 60 * 1000,
            ).toISOString();
    const poll: Poll = {
      id: editingPoll?.id ?? newPollId,
      title: title.trim(),
      description: description.trim(),
      createdAt: editingPoll?.createdAt ?? new Date().toISOString(),
      creatorId: user.id,
      isPublic,
      commentsPublic: editingPoll?.commentsPublic ?? true,
      ...(endsAt ? { endsAt } : {}),
      status: editingPoll?.status ?? "open",
      options: cleanOptions,
      votes: editingPoll?.votes ?? [],
      comments: editingPoll?.comments ?? [],
    };
    try {
      setSaving(true);
      await savePoll(poll);
      clearDraft(draftKey);
      navigate(`/poll/${poll.id}/results${editingPoll ? "" : "?share=1"}`, {
        state: { returnTo: "/settings", published: !editingPoll, saved: Boolean(editingPoll) },
      });
    } catch (saveError) {
      console.error("Could not save poll.", saveError);
      setError("poll.saveFailed");
    } finally { setSaving(false); }
  };

  return (
    <PageShell
      showNavigation={false}
      backTo="/"
      title={editingPoll ? t("poll.edit") : copyId ? t("poll.copy") : t("poll.create")}
      showHeaderTitle
      footer={
        <div className="create-submit-footer">
          <PurpleButton type="submit" form="create-poll-form" fullWidth disabled={draftReady !== draftKey || saving || uploadCount > 0 || !title.trim() || options.length < 2 || options.length > 5}>
            {t(saving ? "common.saving" : editingPoll ? "poll.saveChanges" : "poll.create")} <span>↗</span>
          </PurpleButton>
        </div>
      }
    >
      <form id="create-poll-form" className="create-form" onSubmit={submit}>
        {draftNotice && <p className="field-hint" role="status">{t(draftNotice)}</p>}
        <label className="field-label" htmlFor="poll-title">
          {t("poll.title")} <span className="required">*</span>
        </label>
        <input
          id="poll-title"
          className="text-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("poll.titleHint")}
          maxLength={100}
          required
        />
        <label className="field-label" htmlFor="poll-description">
          {t("poll.description")} <span className="optional">{t("common.optional")}</span>
        </label>
        <textarea
          id="poll-description"
          className="text-input textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("poll.descriptionHint")}
          rows={3}
          maxLength={300}
        />

        <div className="field-row">
          <div>
            <label className="field-label">{t("poll.options")}</label>
          </div>
          <span className="count-pill">{number(options.length)}/{number(5)}</span>
        </div>
        <div className="option-editor-list">
          {options.map((option, index) => (
            <div className="option-editor" key={option.id}>
              <OptionImageInput url={option.imageUrl} index={index}
                onChange={(imageUrl) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, imageUrl } : item))}
                onBusy={(busy) => setUploadCount((count) => Math.max(0, count + (busy ? 1 : -1)))} />
              <div className="option-fields">
                <span className="option-letter">
                  {t("poll.optionalOption", { letter: String.fromCharCode(65 + index) })}
                </span>
                <input
                  className="text-input compact-input"
                  aria-label={t("poll.indexedOptionName", { index: index + 1 })}
                  value={option.name}
                  onChange={(event) =>
                    updateOption(option.id, event.target.value)
                  }
                  placeholder={t("poll.blankOptionLetter", { letter: String.fromCharCode(65 + index) })}
                  maxLength={60}
                />
              </div>
              {options.length > 2 && (
                <button
                  className="remove-option-button"
                  disabled={uploadCount > 0}
                  type="button"
                  aria-label={t("poll.deleteOption", { index: index + 1 })}
                  onClick={() =>
                    setOptions((current) =>
                      current.filter((item) => item.id !== option.id),
                    )
                  }
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 5 && (
          <button
            className="add-option-button"
            type="button"
            onClick={() =>
              setOptions((current) => [
                ...current,
                makeOption(),
              ])
            }
          >
            <AppIcon name="plus" /> {t("poll.addOption")}
          </button>
        )}
        <div className="deadline-row">
          <label className="field-label" htmlFor="deadline">
            {t("poll.deadline")}
          </label>
          <select
            id="deadline"
            className="text-input deadline-select"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          >
            <option value="none">{t("poll.noDeadline")}</option>
            <option value="24">{t("poll.hoursLater", { count: 24 })}</option>
            <option value="72">{t("poll.daysLater", { count: 3 })}</option>
            <option value="168">{t("poll.daysLater", { count: 7 })}</option>
            {editingPoll?.endsAt && (
              <option value="custom">{t("poll.keepDeadline")}</option>
            )}
          </select>
        </div>
        <label className="poll-visibility-choice">
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
          <span>{t("poll.public")}<small>{t("poll.publicHelp")}</small></span>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {t(error)}
          </p>
        )}
      </form>
    </PageShell>
  );
}
