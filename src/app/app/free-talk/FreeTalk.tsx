"use client";

import { useState } from "react";
import { ArrowRight, Briefcase, GraduationCap, MessagesSquare, Smile, type LucideIcon } from "lucide-react";
import Conversation from "@/components/Conversation";
import Container from "@/components/Container";
import { PERSONAS } from "@/lib/languages";

const ICONS: Record<string, LucideIcon> = {
  friendly: Smile,
  career: Briefcase,
  debate: MessagesSquare,
  professor: GraduationCap,
};

export default function FreeTalk({ speechLang, language }: { speechLang: string; language?: string }) {
  const [persona, setPersona] = useState<string | null>(null);

  if (persona) {
    const p = PERSONAS[persona];
    return (
      <Conversation
        persona={persona}
        title={`Free Talk: ${p.label}`}
        speechLang={speechLang}
        language={language}
        starters={p.starters}
      />
    );
  }

  return (
    <Container>
      <h1>Free Talk</h1>
      <p className="mt-1 text-muted-foreground">Choose who you want to talk to.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
    </Container>
  );
}
