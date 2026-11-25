import { useLocale } from "../../i18n/LocaleProvider";

export function LoadingSpinner() {
  return (
    <svg className="loading-spinner" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.93 9h-2.02A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
    </svg>
  );
}

export function LoadingState({ message }: { message?: string }) {
  const { t } = useLocale();
  return (
    <p className="loading-state" role="status">
      <LoadingSpinner />
      <span>{message ?? t("poll.loading")}</span>
    </p>
  );
}
