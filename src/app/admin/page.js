"use client";

import { useState } from "react";

export default function AdminPage() {
  const [domain, setDomain] = useState("");
  const [script, setScript] = useState("");

  async function generate() {
    const res = await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ domain }),
    });

    const data = await res.json();
    setScript(`<script src="${data.script}" async></script>`);
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Add Domain</h1>

      <input
        value={domain}
        placeholder="example.com"
        onChange={(e) => setDomain(e.target.value)}
      />

      <button onClick={generate}>Generate Script</button>

      {script && (
        <>
          <h3>Embed this script</h3>
          <pre>{script}</pre>
        </>
      )}
    </div>
  );
}
