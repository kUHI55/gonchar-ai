"use client";

import { useEffect, useMemo, useState } from "react";
import EinsteinLoader from "../components/EinsteinLoader";

import LessonLayout from "../components/lesson/LessonLayout";
import TasksPanel from "../components/lesson/TasksPanel";
import TheoryPanel from "../components/lesson/TheoryPanel";
import AnswerArea from "../components/lesson/AnswerArea";
import ChatPanel from "../components/lesson/ChatPanel";

// ✅ генерация урока через API
async function generateLesson(topic) {
  const res = await fetch("/api/generate-lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });

  const data = await res.json();

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

  // Текстовое решение (можно вводить руками или будет вставляться после OCR)
  const [answerText, setAnswerText] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);

  // ✅ Фото → OCR → подтверждение
  const [photoFile, setPhotoFile] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [pendingText, setPendingText] = useState(""); // то, что распознали
  const [awaitConfirm, setAwaitConfirm] = useState(false); // показываем "я понял так, верно?"

  const [messages, setMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  const activeTask = useMemo(() => {
    if (!lesson?.tasks?.length) return null;
    return lesson.tasks.find((t) => t.id === activeTaskId) || lesson.tasks[0];
  }, [lesson, activeTaskId]);

  // читаем тему из URL и генерим урок
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
            "⚠️ Не удалось сгенерировать урок через API.\n\n" +
            `Ошибка: ${e?.message || "unknown"}`,
          tasks: [
            {
              id: "t1",
              title: "Задача 1",
              prompt: "Пока нет задач — генерация не сработала.",
            },
          ],
        });
        setActiveTaskId("t1");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // блокируем скролл при лоадере
  useEffect(() => {
    if (!loading) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loading]);

  // ✅ СБРОС при смене задачи
  useEffect(() => {
    setAnswerText("");
    setPhotoFile(null);
    setPendingText("");
    setAwaitConfirm(false);
  }, [activeTaskId]);

  // ---------- OCR FLOW ----------
  async function runOCR() {
    if (!photoFile) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Сначала выбери фото решения 🙂" },
      ]);
      return;
    }
    if (ocrLoading) return;

    setOcrLoading(true);

    try {
      const form = new FormData();
      form.append("image", photoFile);

      const res = await fetch("/api/ocr", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || data?.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠️ OCR ошибка: ${data?.error || "Unknown"}` },
        ]);
        return;
      }

      const text = (data?.text || "").trim();

      if (!text) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Я не смог прочитать текст на фото. Попробуй более чёткое фото 🙏" },
        ]);
        return;
      }

      // показываем "я понял так"
      setPendingText(text);
      setAwaitConfirm(true);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "Я понял твоё решение так:\n\n" +
            text +
            "\n\nВерно? Нажми «Подтвердить» или «Исправить».",
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Ошибка сети при OCR. Попробуй ещё раз." },
      ]);
    } finally {
      setOcrLoading(false);
    }
  }

  function confirmOCR() {
    if (!pendingText.trim()) return;
    setAnswerText(pendingText);
    setAwaitConfirm(false);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "Ок, принял 👍 Теперь нажми «Проверить»." },
    ]);
  }

  function editOCR() {
    // просто вставим в поле, чтобы пользователь мог поправить
    setAnswerText(pendingText);
    setAwaitConfirm(false);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: "Исправь текст в поле решения и нажми «Проверить»." },
    ]);
  }

  // ---------- CHECK ----------
  async function handleCheck() {
    if (checkLoading) return; // ✅ анти-спам
    if (!activeTask) return;

    const a = (answerText || "").trim();
    if (!a) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Напиши решение или распознай фото, затем нажми «Проверить» 🙂" },
      ]);
      return;
    }

    setCheckLoading(true);

    // показываем сообщение ученика
    setMessages((prev) => [
      ...prev,
      { role: "user", text: `Решение по «${activeTask.title}»:\n${a}` },
    ]);

    try {
      const res = await fetch("/api/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          answerText: a,
          theory: lesson?.theory || "",
          task: activeTask
            ? { id: activeTask.id, title: activeTask.title, prompt: activeTask.prompt }
            : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠️ Ошибка проверки: ${data?.error || "Unknown error"}` },
        ]);
      } else if (data?.error) {
        setMessages((prev) => [...prev, { role: "assistant", text: `⚠️ ${data.error}` }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.feedback || "(пустой ответ)" },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Ошибка сети. Попробуй ещё раз." },
      ]);
    } finally {
      setCheckLoading(false);
    }
  }

  // ---------- CHAT ----------
  async function handleAsk(question) {
    if (chatLoading) return; // ✅ анти-спам

    const q = (question || "").trim();
    if (!q) return;

    setChatLoading(true);

    // показываем вопрос ученика
    setMessages((prev) => [...prev, { role: "user", text: q }]);

    try {
      const res = await fetch("/api/ask-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          question: q,
          theory: lesson?.theory || "",
          task: activeTask
            ? { id: activeTask.id, title: activeTask.title, prompt: activeTask.prompt }
            : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠️ Ошибка API: ${data?.error || "Unknown error"}` },
        ]);
      } else if (data?.error) {
        setMessages((prev) => [...prev, { role: "assistant", text: `⚠️ ${data.error}` }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.answer || "(пустой ответ)" },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Ошибка сети. Проверь интернет и попробуй ещё раз." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <>
      {loading && <EinsteinLoader text="Готовлю урок и примеры..." />}

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

              {/* ✅ блок "фото → распознать → подтвердить" */}
              <div style={{ padding: 12, display: "grid", gap: 8 }}>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  Фото решения (опционально)
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={runOCR}
                    disabled={ocrLoading || !photoFile}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.06)",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    {ocrLoading ? "Читаю фото..." : "Распознать фото"}
                  </button>

                  {awaitConfirm && (
                    <>
                      <button
                        onClick={confirmOCR}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "none",
                          background: "#22c55e",
                          color: "white",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Подтвердить
                      </button>

                      <button
                        onClick={editOCR}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "none",
                          background: "#f59e0b",
                          color: "black",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        Исправить
                      </button>
                    </>
                  )}
                </div>
              </div>

              <ChatPanel onSend={handleAsk} sending={chatLoading} />
            </div>
          }
          bottom={
            <AnswerArea
              answerText={answerText}
              setAnswerText={setAnswerText}
              onCheck={handleCheck}
              checkLoading={checkLoading}
            />
          }
        />
      )}
    </>
  );
}
