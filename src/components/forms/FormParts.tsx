'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'

import type { FormState } from '@/lib/formState'

const inputClass =
  'mt-1.5 block w-full rounded border border-line-strong bg-surface px-3.5 py-3 text-base text-ink transition-colors hover:border-ink-muted focus:border-navy aria-[invalid=true]:border-danger'

type BaseProps = {
  name: string
  label: string
  state: FormState
  required?: boolean
}

function FieldShell({ name, label, state, required, children }: BaseProps & { children: ReactNode }) {
  const t = useTranslations('form')
  const error = state.errors?.[name]
  return (
    <div>
      <label htmlFor={`f-${name}`} className="block text-sm font-semibold text-ink">
        {label}
        {required ? (
          <span className="text-ink-muted">
            {' '}
            <span aria-hidden="true">*</span>
            <span className="sr-only">({t('required')})</span>
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`f-${name}-error`} className="mt-1 text-sm text-danger">
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  )
}

const a11y = (name: string, state: FormState) => {
  const invalid = Boolean(state.errors?.[name])
  return {
    id: `f-${name}`,
    name,
    'aria-invalid': invalid || undefined,
    'aria-describedby': invalid ? `f-${name}-error` : undefined,
    defaultValue: state.values?.[name] ?? '',
  }
}

export function TextField(props: BaseProps & { type?: 'text' | 'email' | 'tel'; autoComplete?: string; maxLength: number }) {
  const { type = 'text', autoComplete, maxLength, required, name, state } = props
  return (
    <FieldShell {...props}>
      <input
        {...a11y(name, state)}
        type={type}
        autoComplete={autoComplete}
        required={required}
        maxLength={maxLength}
        className={inputClass}
      />
    </FieldShell>
  )
}

export function TextAreaField(props: BaseProps & { maxLength: number; rows?: number }) {
  const { maxLength, rows = 6, required, name, state } = props
  return (
    <FieldShell {...props}>
      <textarea {...a11y(name, state)} required={required} maxLength={maxLength} rows={rows} className={inputClass} />
    </FieldShell>
  )
}

export function SelectField(props: BaseProps & { options: { value: string; label: string }[]; placeholder?: string }) {
  const { options, placeholder, required, name, state } = props
  return (
    <FieldShell {...props}>
      <select {...a11y(name, state)} required={required} className={inputClass}>
        <option value="">{placeholder ?? '—'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function ConsentField({ state, privacyHref }: { state: FormState; privacyHref: string }) {
  const t = useTranslations()
  const invalid = Boolean(state.errors?.consent)
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id="f-consent"
          name="consent"
          type="checkbox"
          required
          defaultChecked={state.values?.consent === 'on'}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? 'f-consent-error' : undefined}
          className="mt-0.5 size-5 shrink-0 accent-navy"
        />
        <label htmlFor="f-consent" className="text-sm text-ink-muted">
          {t('form.consent')}{' '}
          <a href={privacyHref} className="font-medium text-navy underline underline-offset-2">
            {t('nav.privacy')}
          </a>
        </label>
      </div>
      {invalid ? (
        <p id="f-consent-error" className="mt-1 text-sm text-danger">
          {t('form.errors.consent')}
        </p>
      ) : null}
    </div>
  )
}

/** Hidden from people and assistive tech; bots that fill it are dropped server-side. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  )
}

export function SubmitButton() {
  const t = useTranslations('form')
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex min-h-12 items-center rounded bg-navy px-7 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? t('sending') : t('submit')}
    </button>
  )
}

/** Announces success / errors and moves focus to the message so keyboard users notice it. */
export function FormStatus({ state }: { state: FormState }) {
  const t = useTranslations('form')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (state.status !== 'idle') ref.current?.focus()
  }, [state])

  if (state.status === 'idle') return null
  const message =
    state.status === 'success'
      ? t('success')
      : t(state.code === 'invalid' ? 'errors.summary' : state.code === 'rateLimited' ? 'errors.rateLimited' : 'errors.server')

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={state.status === 'success' ? 'status' : 'alert'}
      className={`rounded border bg-surface p-4 text-sm font-medium ${state.status === 'success' ? 'border-success text-success' : 'border-danger text-danger'}`}
    >
      {message}
    </div>
  )
}
