"use client";

/**
 * "Book a demo" form — no backend, no DB.
 *
 * On submit it composes a pre-filled email to the founder via a `mailto:` link
 * and opens the visitor's mail client. This keeps the marketing site fully
 * static and stateless while still giving owners a one-tap way to reach out.
 *
 * Accessible: real <label>s, required fields, keyboard-friendly, focus styles
 * from the shared `.field-dark` utility.
 */

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { DEMO_EMAIL } from "@/lib/marketing";

export function DemoForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const centre = String(data.get("centre") ?? "").trim();
    const contact = String(data.get("contact") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const subject = `DriveScore demo request — ${centre || name || "coaching centre"}`;
    const body =
      `Name: ${name}\n` +
      `Centre: ${centre}\n` +
      `Phone / email: ${contact}\n\n` +
      `${message}\n`;

    window.location.href =
      `mailto:${DEMO_EMAIL}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" placeholder="e.g. Priya Raman" required />
        <Field
          label="Centre / school"
          name="centre"
          placeholder="Name, or 'individual student'"
        />
      </div>
      <Field
        label="Phone or email"
        name="contact"
        placeholder="How should we reach you?"
        required
      />
      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-paper/80">
          Anything you&apos;d like us to know{" "}
          <span className="font-normal text-paper/40">(optional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="How many students? When do you run weekend mocks?"
          className="field-dark resize-y"
        />
      </div>

      <button type="submit" className="btn-energy mt-1 w-full sm:w-auto">
        <Send className="h-5 w-5" />
        Send demo request
      </button>

      {sent && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-energy/30 bg-energy/[0.06] px-4 py-3 text-sm text-energy-soft"
        >
          <Mail className="h-4 w-4 shrink-0" />
          Your email app should have opened with the message ready — just hit
          send. If it didn&apos;t, email us directly at {DEMO_EMAIL}.
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-paper/80">
        {label}
        {required && <span className="ml-0.5 text-energy">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        required={required}
        placeholder={placeholder}
        className="field-dark"
      />
    </div>
  );
}
