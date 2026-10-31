// Poll creation form and local prototype workflow. / 投票创建表单及本地原型流程。
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { usePolls } from "../hooks/usePolls";
import type { PollOption } from "../../../types/poll";

const makeOption = (): PollOption => ({ id: crypto.randomUUID(), name: "", imageUrl: "" });

export function CreatePollPage() {
  const navigate = useNavigate();
  const { savePoll } = usePolls();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [options, setOptions] = useState<PollOption[]>([makeOption(), makeOption()]);
  const [error, setError] = useState("");

  const updateOption = (id: string, patch: Partial<PollOption>) =>
    setOptions((current) => current.map((option) => option.id === id ? { ...option, ...patch } : option));

  const createPoll = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanOptions = options.map((option) => ({ ...option, name: option.name.trim(), imageUrl: option.imageUrl?.trim() }))
      .filter((option) => option.name);
    if (!title.trim()) { setError("先给这次选择起个标题吧。"); return; }
    if (cleanOptions.length < 2) { setError("至少需要两个有名称的选项。"); return; }
    if (cleanOptions.length > 6) { setError("最多添加六个选项。"); return; }

    const poll = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
      status: "open" as const,
      options: cleanOptions,
      votes: [],
      comments: [],
    };
    try {
      savePoll(poll);
      navigate(`/polls/${poll.id}/manage`);
    } catch {
      setError("暂时无法保存到此浏览器，请检查浏览器存储设置后重试。");
    }
  };

  return (
    <PageShell title="创建投票">
      <section className="form-intro"><span className="eyebrow">先从一个小问题开始</span><h1>想让朋友帮你选什么？</h1><p>没有对错，只是多听一种想法。</p></section>
      <form className="form-card" onSubmit={createPoll}>
        <label className="field-label" htmlFor="poll-title">问题或标题 <span className="required">*</span></label>
        <input id="poll-title" className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="比如：周末穿哪件去见朋友？" maxLength={100} required />
        <label className="field-label" htmlFor="poll-description">补充一点背景 <span className="optional">可选</span></label>
        <textarea id="poll-description" className="text-input textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="告诉朋友你在意什么……" maxLength={300} rows={3} />

        <div className="field-row"><div><label className="field-label">选项 <span className="required">*</span></label><p className="field-hint">2 个选项是二选一；3 个或更多会按喜好排序。</p></div><span className="count-pill">{options.length}/6</span></div>
        <div className="option-editor-list">
          {options.map((option, index) => (
            <div className="option-editor" key={option.id}>
              <span className="option-index">{String(index + 1).padStart(2, "0")}</span>
              <div className="option-fields">
                <input className="text-input compact-input" aria-label={`选项 ${index + 1} 名称`} value={option.name} onChange={(event) => updateOption(option.id, { name: event.target.value })} placeholder={`选项 ${index + 1} 名称`} maxLength={60} />
                <div className="image-url-row"><span aria-hidden="true">▧</span><input aria-label={`选项 ${index + 1} 图片链接`} value={option.imageUrl ?? ""} onChange={(event) => updateOption(option.id, { imageUrl: event.target.value })} placeholder="图片链接（可选）" /></div>
                {option.imageUrl && <img className="option-preview" src={option.imageUrl} alt={`${option.name || "选项"}预览`} />}
              </div>
              {options.length > 2 && <button className="icon-button remove-option" type="button" onClick={() => setOptions((current) => current.filter((item) => item.id !== option.id))} aria-label={`删除选项 ${index + 1}`}>×</button>}
            </div>
          ))}
        </div>
        <button className="add-option-button" type="button" disabled={options.length >= 6} onClick={() => setOptions((current) => [...current, makeOption()])}>＋ 添加一个选项</button>

        <label className="field-label deadline-label" htmlFor="deadline">投票截止时间 <span className="optional">可选</span></label>
        <input id="deadline" className="text-input date-input" type="datetime-local" value={endsAt} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={(event) => setEndsAt(event.target.value)} />
        <p className="prototype-note">投票只保存在当前浏览器。截止时间会在页面中显示，但不会由服务器自动执行。</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-dark button-wide" type="submit">创建投票 <span aria-hidden="true">↗</span></button>
      </form>
    </PageShell>
  );
}
