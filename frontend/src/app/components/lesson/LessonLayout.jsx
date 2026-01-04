export default function LessonLayout({ left, right, bottom }) {
  return (
    <div style={styles.page}>
      <div style={styles.main}>
        <aside style={styles.left}>{left}</aside>
        <section style={styles.right}>{right}</section>
      </div>
      <div style={styles.bottom}>{bottom}</div>
    </div>
  );
}

const styles = {
  page: {
    height: "100vh",
    display: "grid",
    gridTemplateRows: "1fr auto",
    background: "#0b0f1a",
    color: "white",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: 12,
    padding: 12,
    overflow: "hidden",
  },
  left: {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    overflow: "auto",
  },
  right: {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    overflow: "auto",
  },
  bottom: {
    borderTop: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.35)",
    padding: 12,
  },
};
