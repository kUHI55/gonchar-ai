"use client";

import { useState } from "react";

export default function Home() {
  const [topic, setTopic] = useState("");

  function startLesson() {
    if (!topic.trim()) return;
    window.location.href = `/lesson?topic=${encodeURIComponent(topic)}`;
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>Gonchar AI</div>

        <h1 style={styles.h1}>AI-репетитор по математике</h1>
        <p style={styles.p}>
          Выбери тему — я сгенерирую урок и задачи, а потом проверю решение.
        </p>

        <label style={styles.label}>Тема</label>
        <input
          style={styles.input}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Например: квадратные уравнения"
        />

        <button style={styles.button} onClick={startLesson}>
          Начать урок
        </button>

        <p style={styles.hint}>
          Подсказка: попробуй “проценты”, “системы уравнений”, “производная”.
        </p>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(1000px 500px at 20% 10%, #e8f0ff 0%, transparent 60%), radial-gradient(900px 500px at 80% 30%, #ffe8f0 0%, transparent 55%), #0b0f19",
    color: "#eaf0ff",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
  },
  card: {
    width: "min(680px, 100%)",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },
  badge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  h1: { margin: "0 0 10px", fontSize: 28, lineHeight: 1.15 },
  p: { margin: "0 0 18px", opacity: 0.85, lineHeight: 1.4 },
  label: { display: "block", fontSize: 13, opacity: 0.9, marginBottom: 8 },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "#eaf0ff",
    outline: "none",
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "0",
    background: "#4f8cff",
    color: "#081226",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
  },
  hint: { marginTop: 12, fontSize: 12, opacity: 0.7 },
};
