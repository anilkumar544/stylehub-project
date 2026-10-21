export default function Notice({ children, tone = "error" }) {
  if (!children) return null;
  return <div className={`notice notice-${tone}`} role="status">{children}</div>;
}
