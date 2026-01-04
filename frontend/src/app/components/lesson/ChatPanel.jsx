"use client";

import { useState } from "react";

export default function ChatPanel({ onSend, sending }) {
  const [q, setQ] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    onSend(text);
    setQ("");
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Вопрос по теме</div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Спроси что непонятно (например: почему переносим 3 в другую сторону?)"
          style={styles.input}
        />
        <button type="submit" disabled={sending} style={styles.btn}>
          {sending ? "Думаю..." : "Спросить"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    opacity: 0.9,
    marginBottom: 10,
  },
  form: {
    display: "flex",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#fff",
    padding: "0 12px",
    outline: "none",
  },
  btn: {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: "0",
    background: "#4f8cff",
    color: "#081226",
    fontWeight: 800,
    cursor: "pointer",
    minWidth: 110,
  },
};
