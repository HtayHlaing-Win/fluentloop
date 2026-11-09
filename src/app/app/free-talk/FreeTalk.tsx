"use client";

import { useState } from "react";
import { ArrowRight, Briefcase, GraduationCap, Layers, MessagesSquare, Smile, type LucideIcon } from "lucide-react";
import Conversation from "@/components/Conversation";
import Flashcards from "@/components/Flashcards";
import Container from "@/components/Container";
import { PERSONAS } from "@/lib/languages";

const ICONS: Record<string, LucideIcon> = {
  friendly: Smile,
  career: Briefcase,
  debate: MessagesSquare,
  professor: GraduationCap,
};

export default function FreeTalk({
  speechLang,
  language,
  nativeLanguage,
  initialTab = "talk",
}: {
  speechLang: string;
  language?: string;
  nativeLanguage?: string;
  initialTab?: "talk" | "vocabulary";
}) {
  const [persona, setPersona] = useState<string | null>(null);
  const [tab, setTab] = useState<"talk" | "vocabulary">(initialTab);

  if (persona) {
    const p = PERSONAS[persona];
    return (
      <Conversation
        persona={persona}
        title={`Free Talk: ${p.label}`}
        speechLang={speechLang}
        language={language}
        nativeLanguage={nativeLanguage}
        starters={p.starters}
      />
    );
  }

  return (
    <Container>
      <h1>Free Talk</h1>

      <div role="tablist" aria-label="Free Talk sections" className="mt-4 inline-flex rounded-xl bg-muted p-1">
        {([
          ["talk", "Talk", MessagesSquare],
          ["vocabulary", "Vocabulary practice", Layers],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tab === "vocabulary" ? (
        <div role="tabpanel" id="panel-vocabulary" aria-labelledby="tab-vocabulary" className="mt-8">
          <Flashcards />
        </div>
      ) : (
      <div role="tabpanel" id="panel-talk" aria-labelledby="tab-talk">
      <p className="mt-6 text-muted-foreground">Choose who you want to talk to.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(PERSONAS).map(([key, p]) => {
          const Icon = ICONS[key] ?? Smile;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPersona(key)}
              className="group flex flex-col rounded-2xl border bg-card p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h2 className="mb-1.5">{p.label}</h2>
              <p className="flex-1 text-[0.9rem] leading-relaxed text-muted-foreground">{p.blurb}</p>
              <span className="mt-5 flex items-center gap-1 text-[0.85rem] font-semibold text-primary transition-all group-hover:gap-2">
                Talk <ArrowRight size={14} aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
      </div>
      )}
    </Container>
  );
}
