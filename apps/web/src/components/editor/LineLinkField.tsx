import styles from "./MasterContentEditor.module.css";

interface LineLinkFieldProps {
  label?: string;
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function LineLinkField({
  label = "Link URL",
  value,
  placeholder = "https://example.com…",
  onChange
}: LineLinkFieldProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        name={label.toLowerCase().replace(/\s+/g, "-")}
        type="url"
        autoComplete="url"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
