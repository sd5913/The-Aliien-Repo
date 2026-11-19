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
  const [draftNotice, setDraftNotice] = useState("");
  const editingPoll = polls.find((poll) => poll.id === editingId);
  const copySource = polls.find((poll) => poll.id === copyId);
  const canCopy = !copyId || Boolean(copySource && isPollOwner(copySource, user?.id ?? ""));
  const canEdit = !editingId || Boolean(editingPoll && isPollOwner(editingPoll, user?.id ?? "") && isPollOpen(editingPoll));
  const [title, setTitle] = useState(editingPoll?.title ?? "");
  const [description, setDescription] = useState(
    editingPoll?.description ?? "",
  );

  const [deadline, setDeadline] = useState("none");
  const [options, setOptions] = useState<PollOption[]>(
    editingPoll?.options ?? [makeOption(), makeOption()],
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const key = draftKey;
    if (initialized.current === key) return;
    const source = editingId ? editingPoll : copySource;
    if ((editingId || copyId) && !source) return;
    initialized.current = key;
    const saved = readDraft(draftKey, isCreateDraft);
    if (saved) {
      setTitle(saved.title); setDescription(saved.description); setOptions(saved.options);
      setDeadline(saved.deadline); setNewPollId(saved.pollId); setDraftNotice("已恢复上次未提交的草稿");
    } else if (source) {
      setTitle(source.title); setDescription(source.description);
      setOptions(editingId ? source.options : source.options.map((option) => ({ ...option, id: crypto.randomUUID() })));
      setDeadline(editingId && source.endsAt ? "custom" : "none");
    }
    setDraftReady(draftKey);
  }, [editingId, copyId, editingPoll, copySource, draftKey]);

  useEffect(() => {
    if (draftReady !== draftKey || loading || !user) return;
    if (!saveDraft(draftKey, { pollId: newPollId, title, description, deadline, options })) setDraftNotice("当前浏览器无法保存草稿，请勿关闭页面");
  }, [draftReady, draftKey, loading, user, newPollId, title, description, deadline, options]);

  if (loading)
    return <PageShell showNavigation={false} backTo="/" title="创建投票" showHeaderTitle><p className="empty-inline">正在加载投票…</p></PageShell>;

  if (pollsError)
    return <PageShell showNavigation={false} backTo="/" title="创建投票" showHeaderTitle><p className="settings-feedback" role="alert">投票加载失败，请检查 Supabase 配置后重试。</p></PageShell>;

  if (!canEdit || !canCopy)
    return (
      <PageShell
        showNavigation={false}
        backTo={editingPoll ? `/poll/${editingPoll.id}` : "/"}
        title="编辑投票"
        showHeaderTitle
      >
        <div className="empty-state">
          <h2>无法编辑这次投票</h2>
          <p>{editingPoll && !isPollOpen(editingPoll) ? "投票已结束，不能再修改内容。" : "只有发起者可以修改投票内容。"}</p>
          <Link
            className="purple-button"
            to={editingPoll ? `/poll/${editingPoll.id}` : "/"}
          >
            返回投票
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
    const cleanOptions = options.map((option) => ({
      ...option,
      name: option.name.trim(),
    }));
    if (!title.trim()) {
      setError("請先寫下投票標題。");
      return;
    }
    if (cleanOptions.some((option) => !option.name)) {
      setError("請為每個選項填寫名稱。");
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
      setError("保存失败，请检查网络后重试，填写内容已保留。");
    } finally { setSaving(false); }
  };

  return (
    <PageShell
      showNavigation={false}
      backTo="/"
      title={editingPoll ? "编辑投票" : copyId ? "复制投票" : "创建投票"}
      showHeaderTitle
      footer={
        <div className="create-submit-footer">
          <PurpleButton type="submit" form="create-poll-form" fullWidth disabled={draftReady !== draftKey || saving || uploadCount > 0 || !title.trim() || options.length < 2 || options.length > 5 || options.some((option) => !option.name.trim())}>
            {saving ? "保存中…" : editingPoll ? "保存修改" : "创建投票"} <span>↗</span>
          </PurpleButton>
        </div>
      }
    >
      <form id="create-poll-form" className="create-form" onSubmit={submit}>
        {draftNotice && <p className="field-hint" role="status">{draftNotice}</p>}
        <label className="field-label" htmlFor="poll-title">
          投票标题 <span className="required">*</span>
        </label>
        <input
          id="poll-title"
          className="text-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例如：周末穿哪件外套？"
          maxLength={100}
          required
        />
        <label className="field-label" htmlFor="poll-description">
          说明 <span className="optional">可选</span>
        </label>
        <textarea
          id="poll-description"
          className="text-input textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="补充一点背景，让朋友更了解你的想法～"
          rows={3}
          maxLength={300}
        />

        <div className="field-row">
          <div>
            <label className="field-label">商品选项</label>
          </div>
          <span className="count-pill">{options.length}/5</span>
        </div>
        <div className="option-editor-list">
          {options.map((option, index) => (
            <div className="option-editor" key={option.id}>
              <OptionImageInput url={option.imageUrl} index={index}
                onChange={(imageUrl) => setOptions((current) => current.map((item) => item.id === option.id ? { ...item, imageUrl } : item))}
                onBusy={(busy) => setUploadCount((count) => Math.max(0, count + (busy ? 1 : -1)))} />
              <div className="option-fields">
                <span className="option-letter">
                  {String.fromCharCode(65 + index)} · 选项名称
                </span>
                <input
                  className="text-input compact-input"
                  aria-label={`选项 ${index + 1} 名称`}
                  value={option.name}
                  onChange={(event) =>
                    updateOption(option.id, event.target.value)
                  }
                  placeholder="例如：奶油白针织衫"
                  maxLength={60}
                />
              </div>
              {options.length > 2 && (
                <button
                  className="remove-option-button"
                  disabled={uploadCount > 0}
                  type="button"
                  aria-label={`删除选项 ${index + 1}`}
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
            <AppIcon name="plus" /> 添加选项
          </button>
        )}
        <div className="deadline-row">
          <label className="field-label" htmlFor="deadline">
            截止时间
          </label>
          <select
            id="deadline"
            className="text-input deadline-select"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          >
            <option value="none">不设置</option>
            <option value="24">24 小时后</option>
            <option value="72">3 天后</option>
            <option value="168">7 天后</option>
            {editingPoll?.endsAt && (
              <option value="custom">保留原截止时间</option>
            )}
          </select>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </PageShell>
  );
}
