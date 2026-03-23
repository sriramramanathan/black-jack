import styles from './ErrorToast.module.css';

interface ErrorToastProps {
  message: string | null;
}

// Shown at the top of the screen when the server returns an ERROR message.
// e.g. "It is not your turn", "Minimum bet is $10"
export function ErrorToast({ message }: ErrorToastProps) {
  if (!message) return null;

  return (
    <div className={styles.toast} role="alert">
      ⚠️ {message}
    </div>
  );
}
