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

  // Текстовое решение (можно вводить руками или будет вставляться после OCR)
  const [answerText, setAnswerText] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);

  const [messages, setMessages] = useState([]); // чат + проверка в одной ленте
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

  // ✅ сброс решения при смене задачи
  useEffect(() => {
    setAnswerText("");
  }, [activeTaskId]);

  // ✅ Фото → OCR → "Я понял так: ... верно?"
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
          {
            role: "assistant",
            text: `⚠️ OCR ошибка: ${data?.error || "Unknown error"}`,
          },
        ]);
        return;
      }

      const recognized = String(data?.text || "").trim();
      if (!recognized) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "Я не смог прочитать текст на фото. Попробуй сделать фото чётче 🙏",
          },
        ]);
        return;
      }

      const ok = window.confirm(
        "Я понял твоё решение так:\n\n" + recognized + "\n\nВерно?"
      );

      if (ok) {
        setAnswerText(recognized);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Принял 👍 Теперь нажми «Проверить»." },
        ]);
      } else {
        setAnswerText(recognized);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "Ок. Исправь текст в поле и нажми «Проверить»." },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ Ошибка сети при OCR. Попробуй ещё раз." },
      ]);
    }
  }

  // ✅ проверка решения — API /api/check-answer
  async function handleCheck() {
    if (checkLoading) return;
    if (!activeTask) return;

    const a = String(answerText || "").trim();
    if (!a) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Напиши решение или загрузи фото, затем нажми «Проверить» 🙂",
        },
      ]);
      return;
    }

    setCheckLoading(true);

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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `⚠️ Ошибка проверки: ${data?.error || "Unknown error"}`,
          },
        ]);
      } else if (data?.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠️ ${data.error}` },
        ]);
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

  // ✅ чат — API /api/ask-tutor
  async function handleAsk(question) {
    if (chatLoading) return;

    const q = String(question || "").trim();
    if (!q) return;

    setChatLoading(true);
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠️ Ошибка API: ${data?.error || "Unknown error"}` },
        ]);
      } else if (data?.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠️ ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.answer || "(пустой ответ)" },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "⚠️ Ошибка сети. Проверь интернет и попробуй ещё раз.",
        },
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
