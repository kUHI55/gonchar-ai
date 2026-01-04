export default function TasksPanel({ tasks, activeTaskId, onSelect }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>Задачи</div>

      <div style={styles.list}>
        {tasks.map((t) => {
          const active = t.id === activeTaskId;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              style={{
                ...styles.item,
                ...(active ? styles.itemActive : null),
              }}
            >
              <div style={styles.itemTitle}>{t.title}</div>
              <div style={styles.itemPrompt}>{t.prompt}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrap: { padding: 12 },
  header: { fontWeight: 800, fontSize: 16, marginBottom: 10 },
  list: { display: "grid", gap: 10 },
  item: {
    textAlign: "left",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    cursor: "pointer",
    color: "white",
  },
  itemActive: {
    border: "1px solid rgba(79, 140, 255, 0.7)",
    background: "rgba(79, 140, 255, 0.12)",
  },
  itemTitle: { fontWeight: 800, marginBottom: 6 },
  itemPrompt: { opacity: 0.85, fontSize: 13, lineHeight: 1.35 },
};
