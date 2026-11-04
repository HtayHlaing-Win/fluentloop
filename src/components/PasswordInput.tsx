"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputClass } from "./form-styles";

/** Password field with a show/hide toggle. Takes the usual input props (id, name, autoComplete...). */
export default function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`${inputClass} pr-12`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
}
