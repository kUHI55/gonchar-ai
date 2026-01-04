export default function AnswerArea({ answerText, setAnswerText, onCheck, checkLoading }) {
  return (
    <div style={styles.wrap}>
      <textarea
        style={styles.textarea}
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        placeholder="Напиши решение (или просто ответ), затем нажми «Проверить»..."
      />

      <div style={styles.row}>
        <button style={styles.photoBtn} disabled>
          📷 Фото (скоро)
        </button>

        <button style={styles.checkBtn} onClick={onCheck} disabled={checkLoading}>
          {checkLoading ? "Проверяю..." : "Проверить решение"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: { maxWidth: 1100, margin: "0 auto", display: "grid", gap: 10 },
  textarea: {
    width: "100%",
    minHeight: 90,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    padding: 12,
    outline: "none",
    fontSize: 14,
    lineHeight: 1.4,
    resize: "vertical",
  },
  row: { display: "flex", gap: 10, justifyContent: "space-between" },
  photoBtn: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.6)",
    padding: "10px 14px",
    cursor: "not-allowed",
  },
  checkBtn: {
    borderRadius: 12,
    border: "none",
    background: "#4f8cff",
    color: "#071021",
    fontWeight: 900,
    padding: "10px 14px",
    cursor: "pointer",
    minWidth: 220,
  },
};
