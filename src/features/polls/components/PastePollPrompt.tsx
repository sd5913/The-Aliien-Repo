import { useCallback, useEffect, useRef, useState } from "react";
import { Toast } from "../../../components/ui/Toast";
import { useLocale } from "../../../i18n/LocaleProvider";
import { publicAppOrigin } from "../../../lib/platform";
import { nativePollSharing, pastedPollPath } from "../services/nativePollSharing";

export function PastePollPrompt({ openPoll }: { openPoll: (path: string) => void }) {
  const { t } = useLocale();
  const [revision, setRevision] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const handled = useRef<number | null>(null);
  const detector = useRef(0);

  const detect = useCallback(async () => {
    const request = ++detector.current;
    try {
      const result = await nativePollSharing.detectLink();
      if (request === detector.current) {
        setRevision(result.hasLink && handled.current !== result.revision ? result.revision : null);
      }
    } catch {
      if (request === detector.current) setRevision(null);
    }
  }, []);

  useEffect(() => {
    const listener = nativePollSharing.addListener("foreground", () => void detect());
    void listener.catch(() => {});
    void detect();
    return () => {
      detector.current++;
      void listener.then(handle => handle.remove()).catch(() => {});
    };
  }, [detect]);

  const dismiss = () => {
    handled.current = revision;
    setRevision(null);
  };

  const read = async () => {
    if (revision === null || handled.current === revision) return;
    dismiss();
    setUnavailable(false);
    try {
      const result = await nativePollSharing.readLink({ revision });
      if (result.changed) {
        void detect();
        return;
      }
      const path = pastedPollPath(result.value, publicAppOrigin);
      if (path) {
        openPoll(path);
        return;
      }
    } catch {
      // Treat unavailable pasteboard content like an unsupported link.
    }
    setUnavailable(true);
  };

  return <>
    {revision !== null && <section className="paste-poll-prompt" aria-label={t("share.pastePrompt")}>
      <p role="status">{t("share.pastePrompt")}</p>
      <div>
        <button type="button" className="purple-button" onClick={() => void read()}>{t("share.pasteOpen")}</button>
        <button type="button" className="button-soft" onClick={dismiss}>{t("share.pasteLater")}</button>
      </div>
    </section>}
    {unavailable && <Toast message={t("share.pasteUnavailable")} onClose={() => setUnavailable(false)} />}
  </>;
}
