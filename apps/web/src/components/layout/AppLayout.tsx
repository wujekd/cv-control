import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useEditorStore } from "../../stores/editorStore";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const bootstrap = useEditorStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Skip to Content
      </a>
      <nav className={styles.nav} aria-label="Primary">
        <span className={styles.navBrand}>CV Control</span>
        <NavLink
          to="/profile"
          className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
        >
          Profile
        </NavLink>
        <NavLink
          to="/cvs"
          className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
        >
          CVs
        </NavLink>
        <NavLink
          to="/applications"
          className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
        >
          Applications
        </NavLink>
      </nav>
      <main id="main-content" className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
