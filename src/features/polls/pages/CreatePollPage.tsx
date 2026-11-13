import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { PurpleButton } from "../../../components/ui/PurpleButton";
import { usePolls } from "../hooks/usePolls";
import { getVoter, isPollOwner } from "../utils/voting";
import type { Poll, PollOption } from "../../../types/poll";

function makeOption(index: number): PollOption {
  return { id: crypto.randomUUID(), name: "", imageUrl: `https://picsum.photos/seed/bothpls-option-${index}/240/240` };
}

export function CreatePollPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingId = params.get("id");
  const { polls, savePoll } = usePolls();
  const [voter] = useState(getVoter);
  const editingPoll = polls.find((poll) => poll.id === editingId);
  const canEdit = !editingPoll || isPollOwner(editingPoll, voter.id);
  const [title, setTitle] = useState(editingPoll?.title ?? "");
  const [description, setDescription] = useState(editingPoll?.description ?? "");
  const [deadline, setDeadline] = useState("none");
  const [options, setOptions] = useState<PollOption[]>(editingPoll?.options ?? [makeOption(1), makeOption(2)]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editingId) return;
    if (editingPoll) {
      setTitle(editingPoll.title);
      setDescription(editingPoll.description);
      setOptions(editingPoll.options);
      if (editingPoll.endsAt) setDeadline("custom");
    }
  }, [editingId, editingPoll]);

  if (!canEdit) return <PageShell showNavigation={false} backTo="/" title="编辑投票" showHeaderTitle><div className="empty-state"><h2>无法编辑这次投票</h2><p>只有发起者可以修改投票内容。</p><Link className="purple-button" to={`/poll/${editingPoll?.id}/manage`}>返回投票详情</Link></div></PageShell>;

  const updateOption = (id: string, name: string) => setOptions((current) => current.map((option) => option.id === id ? { ...option, name } : option));
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEdit) return;
    const cleanOptions = options.map((option) => ({ ...option, name: option.name.trim() }));
    if (!title.trim()) { setError("請先寫下投票標題。"); return; }
    if (cleanOptions.some((option) => !option.name)) { setError("請為每個選項填寫名稱。"); return; }
    const endsAt = deadline === "none" ? undefined : deadline === "custom" ? editingPoll?.endsAt : new Date(Date.now() + Number(deadline) * 60 * 60 * 1000).toISOString();
    const poll: Poll = {
      id: editingPoll?.id ?? crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      createdAt: editingPoll?.createdAt ?? new Date().toISOString(),
      creatorId: editingPoll?.creatorId ?? voter.id,
      commentsPublic: editingPoll?.commentsPublic ?? true,
      ...(endsAt ? { endsAt } : {}),
      status: editingPoll?.status ?? "open",
      options: cleanOptions,
      votes: editingPoll?.votes ?? [],
      comments: editingPoll?.comments ?? [],
    };
    try {
      savePoll(poll);
      navigate("/settings", { state: { toast: editingPoll ? "已保存" : "已发布" } });
    } catch (saveError) {
      console.error("Could not save poll.", saveError);
      setError("保存失败，请检查浏览器存储设置后重试。");
    }
  };

  return (
    <PageShell
      showNavigation={false}
      backTo="/"
      title={editingPoll ? "编辑投票" : "创建投票"}
      showHeaderTitle
      footer={<div className="create-submit-footer"><PurpleButton type="submit" form="create-poll-form" fullWidth>{editingPoll ? "保存修改" : "创建投票"} <span>↗</span></PurpleButton></div>}
    >
      <form id="create-poll-form" className="create-form" onSubmit={submit}>
        <label className="field-label" htmlFor="poll-title">投票标题 <span className="required">*</span></label>
        <input id="poll-title" className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：周末穿哪件外套？" maxLength={100} required />
        <label className="field-label" htmlFor="poll-description">说明 <span className="optional">可选</span></label>
        <textarea id="poll-description" className="text-input textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="补充一点背景，让朋友更了解你的想法～" rows={3} maxLength={300} />

        <div className="field-row"><div><label className="field-label">商品选项</label><p className="field-hint">添加 2–5 个选项，投票为单选。</p></div><span className="count-pill">{options.length}/5</span></div>
        <div className="option-editor-list">{options.map((option, index) => (
          <div className="option-editor" key={option.id}>
            <img className="option-editor-image" src={option.imageUrl || `https://picsum.photos/seed/bothpls-option-${index}/240/240`} alt="" />
            <div className="option-fields"><span className="option-letter">{String.fromCharCode(65 + index)} · 选项名称</span><input className="text-input compact-input" aria-label={`选项 ${index + 1} 名称`} value={option.name} onChange={(event) => updateOption(option.id, event.target.value)} placeholder="例如：奶油白针织衫" maxLength={60} /></div>
            {options.length > 2 && <button className="remove-option-button" type="button" aria-label={`删除选项 ${index + 1}`} onClick={() => setOptions((current) => current.filter((item) => item.id !== option.id))}>×</button>}
          </div>
        ))}</div>
        {options.length < 5 && <button className="add-option-button" type="button" onClick={() => setOptions((current) => [...current, makeOption(current.length + 1)])}>＋ 添加选项</button>}
        <div className="deadline-row"><label className="field-label" htmlFor="deadline">截止时间</label><select id="deadline" className="text-input deadline-select" value={deadline} onChange={(event) => setDeadline(event.target.value)}><option value="none">不设置</option><option value="24">24 小时后</option><option value="72">3 天后</option><option value="168">7 天后</option>{editingPoll?.endsAt && <option value="custom">保留原截止时间</option>}</select></div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </PageShell>
  );
}
