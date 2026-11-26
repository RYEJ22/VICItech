export const PENDING_AI_PROMPT_KEY = 'vicitech_ai_pending_prompt';
export const OPEN_AI_WIDGET_EVENT = 'vicitech:open-ai';
export const AI_PROMPT_EVENT = 'vicitech:ai-prompt';

export function openAiConsultation(prompt: string): void {
  if (typeof window === 'undefined') return;
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) return;

  try {
    window.sessionStorage.setItem(PENDING_AI_PROMPT_KEY, cleanPrompt);
  } catch {
    // Abaikan jika sessionStorage tidak tersedia pada mode privat browser.
  }

  window.dispatchEvent(new CustomEvent(OPEN_AI_WIDGET_EVENT, { detail: cleanPrompt }));
  window.dispatchEvent(new CustomEvent(AI_PROMPT_EVENT, { detail: cleanPrompt }));
}

export function consumePendingAiPrompt(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.sessionStorage.getItem(PENDING_AI_PROMPT_KEY);
    if (!raw) return '';
    window.sessionStorage.removeItem(PENDING_AI_PROMPT_KEY);
    return raw.trim();
  } catch {
    return '';
  }
}
