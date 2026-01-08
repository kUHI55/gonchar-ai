"use client";

import { useEffect, useRef, useState } from "react";

export default function AnswerArea({
  answerText,
  setAnswerText,
  onCheck,
  checkLoading,
  onUploadImage,
}) {
  const fileRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileName, setFileName] = useState("");

  function pickFile() {
    fileRef.current?.click();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // если было предыдущее превью — освобождаем память
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    if (onUploadImage) {
      await onUploadImage(file);
    }
  }

  function clearPhoto() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileName("");

    // ВАЖНО: сбрасываем value у input, иначе выбор того же файла может не триггерить onChange
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  // cleanup при размонтировании компонента
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
            id="ocr-file-input" // ✅ для теста через консоль
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
  actions: { display: "flex", gap: 8, alignItems: "center" },

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
  },
  previewHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  previewTitle: { fontSize: 12, opacity: 0.8 },
  previewImg: {
    width: "100%",
    height: "auto",
    borderRadius: 10,
    display: "block",
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
    fontWeight: 700,},
  btnSmall: {
    padding: "6px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontSize: 12,
  },
};