"use client";

import { useEffect, useMemo, useState } from "react";
import EinsteinLoader from "../components/EinsteinLoader";

import LessonLayout from "../components/lesson/LessonLayout";
import TasksPanel from "../components/lesson/TasksPanel";
import TheoryPanel from "../components/lesson/TheoryPanel";
import AnswerArea from "../components/lesson/AnswerArea";
import ChatPanel from "../components/lesson/ChatPanel";

// ---------- API ----------
async function generateLesson(topic) {
  const res = await fetch("/api/generate-lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data?.error) {
    throw new Error(data?.error || "Ошибка генерации урока");
  }

  return data;
}

export default function LessonPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);

  const [lesson, setLesson] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);

  const [answerText, setAnswerText] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);

  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // ✅ ВЕРДИКТ
  const [verdict, setVerdict] = useState(null);
  // "correct" | "incorrect" | "unclear" | null

  const activeTask = useMemo(() => {
    if (!lesson?.tasks?.length) return null;
    return lesson.tasks.find((t) => t.id === activeTaskId) || lesson.tasks[0];
  }, [lesson, activeTaskId]);

  // ---------- LOAD ----------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("topic") || "математика";
    setTopic(t);

    (async () => {
      try {
        setLoading(true);
        const data = await generateLesson(t);
        setLesson(data);
        setActiveTaskId(data.tasks?.[0]?.id || null);
      } catch (e) {
        setLesson({
          title: `Тема: ${t}`,
          theory:
            "⚠️ Не удалось сгенерировать урок.\n\n" +
            `Ошибка: ${e?.message || "unknown"}`,
          tasks: [
            {
              id: "t1",
              title: "Задача 1",
              prompt: "Нет задач — генерация не сработала.",
            },
          ],
        });
        setActiveTaskId("t1");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ---------- UI HELPERS ----------
  useEffect(() => {
    if (!loading) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [loading]);

  // ✅ СБРОС при смене задачи
  useEffect(() => {
    setAnswerText("");
    setVerdict(null);
  }, [activeTaskId]);

  // ---------- OCR ----------
  async function handleUploadImage(file) {
    if (!file) return;

    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "Ок, читаю фото… ⏳" },
    ]);

    try {
      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠️ OCR ошибка` },
        ]);
        return;
      }

      const recognized = String(data?.text || "").trim();
      if (!recognized) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Не смог прочитать текст 😕" },
        ]);
        return;
      }

      const ok = window.confirm(
        "Я понял твоё решение так:\n\n" + recognized + "\n\nВерно?"
      );

      setAnswerText(recognized);
      setVerdict(null);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: ok
            ? "Принял 👍 Теперь нажми «Проверить»."
            : "Исправь текст и нажми «Проверить».",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Ошибка OCR" },
      ]);
    }
  }

  // ---------- CHECK ----------
  async function handleCheck() {
    if (checkLoading || !activeTask) return;

    const a = answerText.trim();
    if (!a) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Напиши решение 🙂" },
      ]);
      return;
    }

    setCheckLoading(true);
    setVerdict(null);

    setMessages((prev) => [
      ...prev,
      { role: "user", text: `Решение:\n${a}` },
    ]);

    try {
      const res = await fetch("/api/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          answerText: a,
          theory: lesson?.theory || "",
          task: activeTask,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && !data?.error) {
        setVerdict(data.verdict || "unclear");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.feedback || "" },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "⚠️ Ошибка проверки" },
        ]);
      }
    } finally {
      setCheckLoading(false);
    }
  }

  // ---------- CHAT ----------
  async function handleAsk(question) {
    if (chatLoading || !question.trim()) return;

    setChatLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: question }]);

    try {
      const res = await fetch("/api/ask-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          question,
          theory: lesson?.theory || "",
          task: activeTask,
        }),
      });

      const data = await res.json().catch(() => ({}));

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer || "" },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <>
      {loading && <EinsteinLoader text="Готовлю урок..." />}

      {!loading && lesson && (
        <LessonLayout
          left={
            <TasksPanel
              tasks={lesson.tasks}
              activeTaskId={activeTaskId}
              onSelect={setActiveTaskId}
            />
          }
          right={
            <div>
              <TheoryPanel
                title={lesson.title}
                theory={lesson.theory}
                activeTask={activeTask}
                messages={messages}
              />

              {/* ✅ ВЕРДИКТ */}
              {verdict && (
                <div
                  style={{
                    margin: "12px 0",
                    padding: "12px",
                    borderRadius: 12,
                    fontWeight: 800,
                    textAlign: "center",
                    background:
                      verdict === "correct"
                        ? "rgba(34,197,94,0.15)"
                        : verdict === "incorrect"
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(234,179,8,0.15)",
                    color:
                      verdict === "correct"
                        ? "#22c55e"
                        : verdict === "incorrect"
                        ? "#ef4444"
                        : "#eab308",
                  }}
                >
                  {verdict === "correct" && "✅ Решение верное"}
                  {verdict === "incorrect" && "❌ Решение неверное"}
                  {verdict === "unclear" && "❓ Нужно уточнение решения"}
                </div>
              )}

              <ChatPanel onSend={handleAsk} sending={chatLoading} />
            </div>
          }
          bottom={
            <AnswerArea
              answerText={answerText}
              setAnswerText={setAnswerText}
              onCheck={handleCheck}
              checkLoading={checkLoading}
              onUploadImage={handleUploadImage}
            />
          }
        />
      )}
    </>
  );
}
