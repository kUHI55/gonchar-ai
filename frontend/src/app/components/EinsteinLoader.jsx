"use client";

import { useEffect } from "react";
import Lottie from "lottie-react";
import animationData from "./EinsteinLoader.json";

export default function EinsteinLoader({ text = "Готовлю урок..." }) {

  // 🔒 Блокируем скролл, пока открыт лоадер
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <Lottie
          animationData={animationData}
          loop
          autoplay
          style={{ width: 260, margin: "0 auto" }}
        />
        <div style={styles.text}>{text}</div>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "grid",
    placeItems: "center",
    zIndex: 9999,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    backdropFilter: "blur(10px)",
    textAlign: "center",
    color: "#fff",
  },
  text: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 600,
  },
};
