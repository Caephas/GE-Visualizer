import { useEffect, useMemo, useRef, useState } from "react";

import { NEW_ISSUE_URL } from "../config";
import {
  buildFeedbackBody,
  buildFeedbackTitle,
  buildIssueUrl,
  FEEDBACK_KINDS,
  type FeedbackDiagnostics,
  type FeedbackKind,
} from "../lib/feedback";

export interface FeedbackContext {
  grammarStatus: string;
  rules: number | null;
  mappingStatus: string;
  steps: number;
}

export interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  context: FeedbackContext;
}

/**
 * Feedback composer. It works with no backend: the report is either opened as a
 * prefilled GitHub issue or copied to the clipboard, and always includes the
 * current app state (the URL already encodes grammar + genome + params) so a
 * report can be reproduced.
 */
export function FeedbackDialog({ open, onClose, context }: FeedbackDialogProps) {
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setNote(null);
    textareaRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const report = useMemo(() => {
    if (!open) return null;
    const diagnostics: FeedbackDiagnostics = {
      url: window.location.href,
      grammarStatus: context.grammarStatus,
      rules: context.rules,
      mappingStatus: context.mappingStatus,
      steps: context.steps,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
    return {
      title: buildFeedbackTitle(kind, message),
      body: buildFeedbackBody(message, diagnostics),
    };
  }, [open, kind, message, context]);

  if (!open || !report) return null;

  const openIssue = () => {
    window.open(
      buildIssueUrl(NEW_ISSUE_URL, report.title, report.body),
      "_blank",
      "noopener,noreferrer",
    );
    onClose();
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(`${report.title}\n\n${report.body}`);
      setNote("Copied — paste it wherever you like.");
    } catch {
      setNote("Couldn't reach the clipboard — open the details and copy manually.");
    }
  };

  return (
    <div className="feedback-overlay" role="dialog" aria-modal="true" aria-label="Send feedback">
      <div className="feedback-card">
        <header className="feedback-header">
          <span className="feedback-title">Send feedback</span>
          <button
            type="button"
            className="help-close"
            onClick={onClose}
            aria-label="Close feedback"
          >
            ×
          </button>
        </header>

        <label className="feedback-field">
          <span>What kind of feedback?</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as FeedbackKind)}>
            {FEEDBACK_KINDS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="feedback-field">
          <span>Your message</span>
          <textarea
            ref={textareaRef}
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="What happened, or what would make this better?"
          />
        </label>

        <details className="feedback-details">
          <summary>Report details (included automatically)</summary>
          <pre>{report.body}</pre>
        </details>

        <div className="feedback-actions">
          <button type="button" className="feedback-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="feedback-secondary" onClick={() => void copyReport()}>
            Copy report
          </button>
          <button type="button" className="button-primary" onClick={openIssue}>
            Open GitHub issue
          </button>
        </div>

        {note && (
          <p className="feedback-note" role="status">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
