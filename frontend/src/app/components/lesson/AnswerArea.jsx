"use client";

import { useEffect, useRef, useState } from "react";

export default function AnswerArea({
  answerText,
  setAnswerText,
  onCheck,
  checkLoading,
}) {
  const fileRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileObj, setFileObj] = useState(null);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [pendingText, setPendingText] = useState(""); // распознанный текст
  const [showConfirm, setShowConfirm] = useState(false);

  function pickFile() {
    fileRef.current?.click();
  }

  function clearPhoto() {
    setFileObj(null);
    setFileName("");
    setPendingText("");
    setShowConfirm(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileObj(file);
    setFileName(file.name);
    setPendingText("");
    setShowConfirm(false);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  async function runOCR() {
    if (!fileObj) return;
    if (ocrLoading) return;

    setOcrLoading(true);

    try {
      const fd = new FormData();
      fd.append("image", fileObj);

      const res = await fetch("/api/ocr", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.error) {
        alert(`OCR ошибка: ${data?.error || "Unknown error"}`);
        return;
      }

      const recognized = String(data?.text || "").trim();
      if (!recognized) {
        alert("Я не смог прочитать текст на фото. Попробуй сделать фото чётче 🙏");
        return;
      }

      setPendingText(recognized);
      setShowConfirm(true);
    } catch (e) {
      alert("Ошибка сети при OCR. Попробуй ещё раз.");
    } finally {
      setOcrLoading(false);
    }
  }

  function confirmOCR() {
    if (!pendingText.trim()) return;
    setAnswerText(pendingText);
    setShowConfirm(false);
  }

  function editOCR() {
    if (!pendingText.trim()) return;
    // вставляем распознанное в поле — пользователь правит руками
    setAnswerText(pendingText);
    setShowConfirm(false);
  }

  // аккуратно освобождаем objectURL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div style={styles.wrap}>
      <div style={styles.row}>
        <div style={styles.title}>Твоё решение</div>

        <div style={styles.actions}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFile}
          />

          <button type="button" style={styles.btnGhost} onClick={pickFile}>
            📷 Фото
          </button>

          <button
            type="button"
            style={{
              ...styles.btnGhost,
              opacity: fileObj ? 1 : 0.5,
              cursor: fileObj ? "pointer" : "not-allowed",
            }}
            onClick={runOCR}
            disabled={!fileObj || ocrLoading}
          >
            {ocrLoading ? "Читаю..." : "Распознать"}
          </button>

          <button
            type="button"
            style={styles.btnPrimary}
            onClick={onCheck}
            disabled={checkLoading}
          >
            {checkLoading ? "Проверяю..." : "Проверить"}
          </button>
        </div>
      </div>

      {previewUrl && (
        <div style={styles.previewBox}>
          <div style={styles.previewHeader}>
            <div style={styles.previewTitle}>Фото: {fileName}</div>
            <button type="button" style={styles.btnSmall} onClick={clearPhoto}>
              Убрать
            </button>
          </div>

          <img src={previewUrl} alt="preview" style={styles.previewImg} />

          {/* ✅ Блок подтверждения распознанного текста */}
          {showConfirm && (
            <div style={styles.confirmBox}><div style={styles.confirmTitle}>Я понял твоё решение так:</div>
              <pre style={styles.confirmText}>{pendingText}</pre>

              <div style={styles.confirmActions}>
                <button type="button" style={styles.btnOk} onClick={confirmOCR}>
                  ✅ Подтвердить
                </button>
                <button type="button" style={styles.btnEdit} onClick={editOCR}>
                  ✏️ Исправить
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <textarea
        style={styles.textarea}
        placeholder="Напиши решение текстом или загрузи фото…"
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
      />
    </div>
  );
}

const styles = {
  wrap: { display: "grid", gap: 10 },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  title: { fontSize: 14, opacity: 0.85, fontWeight: 700 },
  actions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },

  textarea: {
    width: "100%",
    minHeight: 120,
    borderRadius: 12,
    padding: 12,
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "white",
    outline: "none",
    resize: "vertical",
  },

  previewBox: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    padding: 10,
    display: "grid",
    gap: 10,
  },
  previewHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  previewTitle: { fontSize: 12, opacity: 0.8 },
  previewImg: {
    width: "100%",
    height: "auto",
    borderRadius: 10,
    display: "block",
  },

  confirmBox: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    padding: 10,
  },
  confirmTitle: { fontSize: 13, opacity: 0.9, fontWeight: 700, marginBottom: 8 },
  confirmText: {
    whiteSpace: "pre-wrap",
    margin: 0,
    borderRadius: 10,
    padding: 10,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    maxHeight: 220,
    overflow: "auto",
  },
  confirmActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 10,
  },

  btnPrimary: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  btnGhost: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  btnSmall: {
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontSize: 12,
  },
  btnOk: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "#22c55e",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  btnEdit: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    background: "#f59e0b",
    color: "black",
    fontWeight: 900,
    cursor: "pointer",
  },
};