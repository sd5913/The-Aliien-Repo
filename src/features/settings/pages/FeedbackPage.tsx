import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../../../components/layout/PageShell";
import { AppIcon } from "../../../components/ui/AppIcon";
import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import { FEEDBACK_IMAGE_MAX_BYTES, FEEDBACK_IMAGE_TYPES, submitFeedback, uploadFeedbackScreenshot } from "../services/feedback";

export function FeedbackPage() {
  const { t, locale } = useLocale();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<MessageKey | "">("");
  const submitting = useRef(false);
  const uploaded = useRef<{ file: File; path: string } | null>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!screenshot) { setPreview(""); return; }
    const url = URL.createObjectURL(screenshot);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

  useEffect(() => {
    if (submitted) successHeading.current?.focus();
  }, [submitted]);

  const chooseScreenshot = (file: File | undefined) => {
    if (!file) return;
    if (!FEEDBACK_IMAGE_TYPES.includes(file.type)) { setError("feedback.imageFormat"); return; }
    if (file.size > FEEDBACK_IMAGE_MAX_BYTES) { setError("feedback.imageSize"); return; }
    setError("");
    setScreenshot(file);
    uploaded.current = null;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!title.trim() || !body.trim()) { setError("feedback.required"); return; }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      if (screenshot && uploaded.current?.file !== screenshot) {
        const path = await uploadFeedbackScreenshot(screenshot);
        // Keep a successful upload for retries if the subsequent insert fails.
        uploaded.current = { file: screenshot, path };
      }
      await submitFeedback({ title, body, contact, locale, screenshotPath: uploaded.current?.path ?? null });
      setSubmitted(true);
      setScreenshot(null);
      uploaded.current = null;
    } catch {
      setError("feedback.failed");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <PageShell title={t("feedback.title")} showHeaderTitle backTo="/settings/preferences" showNavigation={false}>
      <div className="settings-v2 feedback-page">
        {submitted ? (
          <section className="settings-group feedback-success" role="status">
            <span className="feedback-hero-icon"><AppIcon name="finished" size={32} /></span>
            <h2 ref={successHeading} tabIndex={-1}>{t("feedback.success")}</h2>
            <p>{t("feedback.successBody")}</p>
            <Link className="purple-button button-full" to="/settings/preferences">{t("feedback.back")}</Link>
          </section>
        ) : (
          <>
            <div className="feedback-intro">
              <span className="feedback-hero-icon"><AppIcon name="feedback" size={28} /></span>
              <div><h2>{t("feedback.intro")}</h2><p>{t("feedback.introBody")}</p></div>
            </div>
            <form onSubmit={submit} aria-label={t("feedback.title")}>
              <fieldset className="settings-group feedback-fields" disabled={busy}>
                <legend className="sr-only">{t("feedback.details")}</legend>
                <div>
                  <label className="field-label" htmlFor="feedback-title">{t("feedback.subject")}</label>
                  <input id="feedback-title" className="text-input" required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder={t("feedback.subjectPlaceholder")} />
                </div>
                <div>
                  <label className="field-label" htmlFor="feedback-body">{t("feedback.body")}</label>
                  <textarea id="feedback-body" className="text-input" required rows={5} maxLength={3000} value={body} onChange={event => setBody(event.target.value)} placeholder={t("feedback.bodyPlaceholder")} aria-describedby="feedback-body-count" />
                  <span id="feedback-body-count" className="feedback-count">{body.length} / 3000</span>
                </div>
                <div>
                  <label className="field-label" htmlFor="feedback-screenshot">{t("feedback.screenshot")} <span>{t("feedback.optional")}</span></label>
                  {preview ? (
                    <div className="feedback-attachment">
                      <img src={preview} alt={t("feedback.preview")} />
                      <button type="button" className="button-soft" onClick={() => { setScreenshot(null); uploaded.current = null; }}>{t("feedback.remove")}</button>
                    </div>
                  ) : null}
                  <label className="feedback-upload" htmlFor="feedback-screenshot">
                    <AppIcon name="camera" size={22} />
                    <span>{t(preview ? "feedback.replace" : "feedback.upload")}<small>{t("feedback.imageHint")}</small></span>
                    <input id="feedback-screenshot" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="feedback-error" onChange={event => { chooseScreenshot(event.target.files?.[0]); event.target.value = ""; }} />
                  </label>
                </div>
                <div>
                  <label className="field-label" htmlFor="feedback-contact">{t("feedback.contact")} <span>{t("feedback.optional")}</span></label>
                  <input id="feedback-contact" className="text-input" maxLength={200} value={contact} onChange={event => setContact(event.target.value)} placeholder={t("feedback.contactPlaceholder")} />
                </div>
              </fieldset>
              <p className="feedback-privacy">{t("feedback.privacy")}</p>
              <div id="feedback-error">{error && <p className="feedback-error" role="alert">{t(error)}</p>}</div>
              <button className="purple-button button-full feedback-submit" type="submit" disabled={busy} aria-busy={busy}>{t(busy ? "feedback.submitting" : "feedback.submit")}</button>
            </form>
          </>
        )}
      </div>
    </PageShell>
  );
}
