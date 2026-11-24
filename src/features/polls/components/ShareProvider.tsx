import { useLocale } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n/catalog";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Toast } from "../../../components/ui/Toast";
import type { Poll } from "../../../types/poll";
import { copyPollLink, renderShareTicket } from "../utils/share";
import { useAccount } from "../../auth/components/AccountProvider";
import { canSharePoll } from "../utils/voting";
import { AppIcon } from "../../../components/ui/AppIcon";

const ShareContext = createContext<(poll: Poll) => void>(() => {});
export const useSharePoll = () => useContext(ShareContext);

function ShareDialog({
  poll,
  onClose,
  feedback,
  clearFeedback,
}: {
  poll: Poll;
  onClose: () => void;
  feedback: MessageKey | "";
  clearFeedback: () => void;
}) {
  const { t, locale } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<{
    poll: Poll;
    locale: typeof locale;
    image?: string;
  }>();
  const ready = preview?.poll === poll && preview.locale === locale;
  const image = ready ? preview.image : undefined;
  const [toast, setToast] = useState<MessageKey | "">("");
  const toastMessage = toast || feedback;
  useEffect(() => {
    const element = dialog.current!;
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      focused?.focus();
    };
  }, []);
  useEffect(() => {
    let active = true;
    renderShareTicket(poll, locale)
      .then((image) => {
        if (active) setPreview({ poll, locale, image });
      })
      .catch(() => {
        if (active) setPreview({ poll, locale });
      });
    return () => {
      active = false;
    };
  }, [poll, locale]);
  return (
    <dialog
      ref={dialog}
      className="share-dialog"
      aria-labelledby="share-dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="share-dialog-content">
        <div className="share-dialog-heading">
          <h2 id="share-dialog-title">{t("share.heading")}</h2>
          <button
            className="share-close"
            onClick={onClose}
            aria-label={t("share.close")}
          >
            ×
          </button>
        </div>
        <div className="share-ticket-preview" aria-busy={!ready}>
          {image ? (
            <img
              src={image}
              alt={t("share.alt", {
                title: poll.title,
                count: poll.options.length,
              })}
            />
          ) : (
            <p role="status">
              {t(ready ? "share.renderFailed" : "share.rendering")}
            </p>
          )}
        </div>
        <div className="share-dialog-actions">
          <a
            className={`button-soft${image ? "" : " is-disabled"}`}
            href={image || undefined}
            download={`BothPls-${poll.title.replace(/[<>:"/\\|?*]/g, "").slice(0, 50) || t("share.filename")}.png`}
            aria-disabled={!image}
            onClick={(event) => {
              if (!image) event.preventDefault();
            }}
          >
            <AppIcon name="export" size={16} /> {t("share.download")}
          </a>
        </div>
        <p className="share-dialog-note">{t("share.note")}</p>
        {toastMessage && (
          <Toast
            message={t(toastMessage)}
            onClose={() => {
              setToast("");
              clearFeedback();
            }}
          />
        )}
      </div>
    </dialog>
  );
}

export function ShareProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAccount();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [toast, setToast] = useState<MessageKey | "">("");
  const open = (selected: Poll) => {
    if (loading || !canSharePoll(selected, user?.id ?? "")) return;
    setPoll(selected);
    // Begin inside the click gesture: browsers require user activation for clipboard writes.
    void copyPollLink(selected.id)
      .then(() => setToast("share.copied"))
      .catch(() => setToast("share.autoCopyFailed"));
  };
  return (
    <ShareContext.Provider value={open}>
      {children}
      {poll && !loading && canSharePoll(poll, user?.id ?? "") && (
        <ShareDialog
          key={poll.id}
          poll={poll}
          feedback={toast}
          clearFeedback={() => setToast("")}
          onClose={() => {
            setPoll(null);
            setToast("");
          }}
        />
      )}
    </ShareContext.Provider>
  );
}
