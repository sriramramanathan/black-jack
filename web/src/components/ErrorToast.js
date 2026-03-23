import { jsxs as _jsxs } from "react/jsx-runtime";
import styles from './ErrorToast.module.css';
// Shown at the top of the screen when the server returns an ERROR message.
// e.g. "It is not your turn", "Minimum bet is $10"
export function ErrorToast({ message }) {
    if (!message)
        return null;
    return (_jsxs("div", { className: styles.toast, role: "alert", children: ["\u26A0\uFE0F ", message] }));
}
