import { Outlet } from "react-router-dom";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Skip to Editor
      </a>
      <main id="main-content" className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
