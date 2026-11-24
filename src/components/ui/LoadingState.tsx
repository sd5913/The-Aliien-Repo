import { useLocale } from "../../i18n/LocaleProvider";

export function LoadingSpinner() {
  return <span className="loading-spinner" aria-hidden="true" />;
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
