'use client';

import { useId } from 'react';
import type { ReactElement } from 'react';
import styles from './toggle-switch.module.css';

interface ToggleSwitchProps {
  readonly id?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly compact?: boolean;
  readonly className?: string;
}

export function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  compact = false,
  className = '',
}: ToggleSwitchProps): ReactElement {
  const generatedId = useId();
  const controlId = id ?? generatedId;

  const wrapperLayout = compact
    ? 'inline-flex min-h-11 items-center gap-2.5 rounded-lg border border-default bg-canvas px-3 py-1.5'
    : 'flex min-h-11 items-center justify-between gap-3 rounded-lg border border-default bg-canvas px-3.5 py-2.5';

  return (
    <div
      className={`${wrapperLayout} ${
        disabled ? 'cursor-not-allowed opacity-55' : ''
      } ${className}`}
    >
      <div className="min-w-0">
        <label
          htmlFor={controlId}
          className={`block select-none font-medium text-primary ${
            compact ? 'text-xs' : 'text-sm'
          } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-secondary">{description}</p>
        ) : null}
      </div>

      <button
        id={controlId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          if (!disabled) onChange(!checked);
        }}
        className={`${styles.switchControl ?? ''} inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60`}
      >
        <span
          aria-hidden="true"
          className={`${styles.track ?? ''} border ${
            checked
              ? 'border-accent-cta bg-accent-cta hover:bg-accent-primary'
              : 'border-default bg-subtle'
          }`}
        >
          <span className={styles.thumb ?? ''} />
        </span>
      </button>
    </div>
  );
}
