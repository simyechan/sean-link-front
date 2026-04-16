import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface LinkItem {
  id: number;
  name: string;
  url: string;
}

export default function LinkPage() {
  const { isLoggedIn } = useAuth();

  const [links, setLinks] = useState<LinkItem[]>([
    { id: 1, name: "유튜브", url: "https://www.youtube.com/@Kisean" },
    { id: 2, name: "기션 더하기", url: "https://www.youtube.com/@kisean_plus" },
    { id: 3, name: "긴션", url: "https://www.youtube.com/@%EA%B8%B4%EC%85%98" },
    { id: 4, name: "치지직", url: "https://chzzk.naver.com/93f06c016e073c01b6bdb4098a99b1a7" },
    { id: 5, name: "팬카페", url: "https://cafe.naver.com/kisean" },
    { id: 6, name: "팬심", url: "https://fancim.me/celeb/profile.aspx?url=122554" },
  ]);

  const getColorByUrl = (url: string) => {
    if (url.includes("youtube")) return "#FF0000";
    if (url.includes("chzzk")) return "#00FFA3";
    if (url.includes("naver")) return "#03C75A";
    if (url.includes("fancim")) return "#ff7aa2";
    return "var(--bg-card)";
  };

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const addLink = () => {
    if (!newName || !newUrl) return;

    setLinks(prev => [
      ...prev,
      { id: Date.now(), name: newName, url: newUrl },
    ]);

    setNewName("");
    setNewUrl("");
  };

  const removeLink = (id: number) => {
    setLinks(prev => prev.filter(link => link.id !== id));
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>링크 모음</h1>

      {/* 링크 목록 */}
      {links.map(link => (
        <div key={link.id} style={styles.card} className="fade-in">
            <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-hover"
                style={{
                    ...styles.link,
                    borderColor: getColorByUrl(link.url),
                }}
            >
                <img
                src={`https://www.google.com/s2/favicons?domain=${link.url}`}
                alt="icon"
                style={styles.icon}
                />
                {link.name}
            </a>

            {isLoggedIn && (
                <button
                onClick={() => removeLink(link.id)}
                style={styles.deleteBtn}
                >
                ✕
                </button>
            )}
        </div>
      ))}

      {/* 관리자 UI */}
      {isLoggedIn && (
        <div style={styles.adminBox}>
          <input
            placeholder="이름"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={styles.input}
          />
          <input
            placeholder="URL"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            style={styles.input}
          />
          <button onClick={addLink} style={styles.addBtn}>
            추가
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "var(--bg-base)",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: "80px",
    color: "white",
  },

  title: {
    marginBottom: "30px",
  },

  card: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "8px",
  },

  icon: {
    width: "18px",
    height: "18px",
    marginRight: "10px",
    verticalAlign: "middle",
  },

  link: {
    width: "320px",
    padding: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    borderRadius: "12px",
    backgroundColor: "var(--bg-card)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  },

  deleteBtn: {
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    borderRadius: "8px",
    padding: "8px",
    cursor: "pointer",
  },

  adminBox: {
    marginTop: "30px",
    display: "flex",
    gap: "10px",
  },

  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "none",
  },

  addBtn: {
    backgroundColor: "#3b82f6",
    border: "none",
    color: "white",
    padding: "10px 15px",
    borderRadius: "8px",
    cursor: "pointer",
  },
};