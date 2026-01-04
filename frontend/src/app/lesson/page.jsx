"use client";

import { useEffect, useMemo, useState } from "react";
import EinsteinLoader from "../components/EinsteinLoader";

import LessonLayout from "../components/lesson/LessonLayout";
import TasksPanel from "../components/lesson/TasksPanel";
import TheoryPanel from "../components/lesson/TheoryPanel";
import AnswerArea from "../components/lesson/AnswerArea";
import ChatPanel from "../components/lesson/ChatPanel";

// ✅ РЕАЛЬНАЯ генерация урока через API
async function generateLesson(topic) {
  const res = await fetch("/api/generate-lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });

  const data = await res.json();

  // если API вернул ошибку (или твой REGION_BLOCK)
  if (!res.ok || data?.error) {
    throw new Error(data?.error || "Ошибка генерации урока");
  }

  return data;
}

// 2) Мок проверки решения (пока оставляем, позже заменим на Wolfram + GPT)
async function mockCheckAnswer({ answerText }) {
  await new Promise((r) => setTimeout(r, 700));
  if (!answerText?.trim()) {
    return { ok: false, feedback: "Напиши решение или ответ, затем нажми «Проверить»." };
  }
  return {
    ok: true,
    feedback:
      "Похоже, ты на верном пути ✅\n\nЕсли хочешь — распиши шаги решения, и я проверю каждый шаг.",
  };
}

export default function LessonPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(true);

  const [lesson, setLesson] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);

  const [answerText, setAnswerText] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);

  const [messages, setMessages] = useState([]); // 💬 чат
  const [chatLoading, setChatLoading] = useState(false);

  const activeTask = useMemo(() => {
    if (!lesson?.tasks?.length) return null;
    return lesson.tasks.find((t) => t.id === activeTaskId) || lesson.tasks[0];
  }, [lesson, activeTaskId]);

  // читаем тему из URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("topic") || "математика";
    setTopic(t);

    (async () => {
      try {
        setLoading(true);
        const data = await generateLesson(t); // ✅ ВОТ ТУТ ЗАМЕНА
        setLesson(data);
        setActiveTaskId(data.tasks?.[0]?.id || null);
      } catch (e) {
        // если генерация упала — покажем сообщение в чате
        setLesson({
          title: `Тема: ${t}`,
          theory:
            "⚠️ Не удалось сгенерировать урок через API.\n\n" +
            "Проверь ключ, VPN/регион и файл .env.local.\n\n" +
            `Ошибка: ${e?.message || "unknown"}`,
          tasks: [
            { id: "t1", title: "Задача 1", prompt: "Пока нет задач — генерация не сработала." },
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

  // проверка решения
  async function handleCheck() {
    if (!activeTask) return;

    setCheckLoading(true);
    const res = await mockCheckAnswer({ answerText });
    setCheckLoading(false);

    setMessages((prev) => [
      ...prev,
      { role: "user", text: `Решение по «${activeTask.title}»:\n${answerText || "(пусто)"}` },
      { role: "assistant", text: res.feedback },
    ]);
  }

  // ✅ вопрос по теме (чат) — реальный API /api/ask-tutor
  async function handleAsk(question) {
    const q = (question || "").trim();
    if (!q) return;

    setChatLoading(true);

    // 1) сразу показываем сообщение ученика
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
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠️ ${data.error}` },
        ]);
      } else {
        // ожидаем { answer: "..." }
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
          text: "⚠️ Ошибка сети. Проверь VPN/интернет и попробуй ещё раз.",
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

              {/* ✅ ЧАТ ПОД ТЕОРИЕЙ */}
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
