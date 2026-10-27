"use client";

import { useState } from "react";
import Conversation from "@/components/Conversation";
import { PERSONAS } from "@/lib/languages";

export default function FreeTalk({ speechLang }: { speechLang: string }) {
  const [persona, setPersona] = useState<string | null>(null);

  if (persona) {
    const p = PERSONAS[persona];
    return <Conversation persona={persona} title={`Free Talk: ${p.label}`} speechLang={speechLang} starters={p.starters} />;
  }

  return (
    <>
      <h1>Free Talk</h1>
      <p className="muted">Choose who you want to talk to.</p>
      <div className="grid" style={{ marginTop: "1rem" }}>
        {Object.entries(PERSONAS).map(([key, p]) => (
          <div className="card" key={key}>
            <h2>{p.label}</h2>
            <p className="muted">{p.blurb}</p>
            <button className="btn" onClick={() => setPersona(key)}>Talk</button>
          </div>
        ))}
      </div>
    </>
  );
}
