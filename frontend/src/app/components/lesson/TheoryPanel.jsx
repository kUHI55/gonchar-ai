function stripLatexLite(text = "") {
  return text
    // убираем \( \) и \[ \]
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "")
    // дроби
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
    // неравенства
    .replace(/\\ge/g, "≥")
    .replace(/\\le/g, "≤")
    // точки
    .replace(/\\dots/g, "...")
    // степени
    .replace(/\^\{([^}]*)\}/g, "^$1")
    // индексы
    .replace(/_\{([^}]*)\}/g, "_$1")
    // лишние слэши
    .replace(/\\/g, "");
}

function renderMarkdownLite(text) {
  const clean = stripLatexLite(text || "");
  const lines = clean.split("\n");

  return lines.map((line, i) => {
    if (line.startsWith("# ")) {
      return <h1 key={i} style={styles.h1}>{line.slice(2)}</h1>;
    }
    if (line.startsWith("## ")) {
      return <h2 key={i} style={styles.h2}>{line.slice(3)}</h2>;
    }
    if (
      line.startsWith("1) ") ||
      line.startsWith("2) ") ||
      line.startsWith("3) ")
    ) {
      return <div key={i} style={styles.li}>{line}</div>;
    }
    return <p key={i} style={styles.p}>{line}</p>;
  });
}

export default function TheoryPanel({ title, theory, activeTask, messages }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.top}>
        <div style={styles.title}>{title}</div>

        {activeTask && (
          <div style={styles.taskBox}>
            <div style={styles.taskTitle}>
              Текущая задача: {activeTask.title}
            </div>
            <div style={styles.taskPrompt}>
              {stripLatexLite(activeTask.prompt)}
            </div>
          </div>
        )}
      </div>

      <div style={styles.theory}>
        {renderMarkdownLite(theory)}
      </div>

      {messages?.length > 0 && (
        <div style={styles.chat}>
          <div style={styles.chatTitle}>Обсуждение</div>
          <div style={styles.chatList}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.msg,
                  ...(m.role === "user" ? styles.user : styles.assistant),
                }}
              >
                <pre style={styles.pre}>
                  {stripLatexLite(m.text)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { padding: 16 },
  top: { marginBottom: 14 },
  title: { fontSize: 18, fontWeight: 900, marginBottom: 10 },

  taskBox: {
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: 12,
    background: "rgba(0,0,0,0.25)",
  },
  taskTitle: { fontWeight: 800, marginBottom: 6 },
  taskPrompt: { opacity: 0.9, lineHeight: 1.35 },

  theory: { marginTop: 14 },
  h1: { fontSize: 20, margin: "12px 0 8px" },
  h2: { fontSize: 16, margin: "12px 0 6px", opacity: 0.95 },
  p: { margin: "6px 0", opacity: 0.9, lineHeight: 1.5 },
  li: { margin: "4px 0", opacity: 0.92 },

  chat: {
    marginTop: 18,
    borderTop: "1px solid rgba(255,255,255,0.10)",
    paddingTop: 14,
  },
  chatTitle: { fontWeight: 900, marginBottom: 10 },
  chatList: { display: "grid", gap: 10 },

  msg: {
    borderRadius: 12,
    padding: 12,
    border: "1px solid rgba(255,255,255,0.10)",
  },
  user: { background: "rgba(79, 140, 255, 0.10)" },
  assistant: { background: "rgba(255,255,255,0.04)" },

  pre: {
    margin: 0,
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
    lineHeight: 1.35,
  },
};
