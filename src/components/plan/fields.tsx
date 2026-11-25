"use client";

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  required,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "url" | "date" | "number" | "password" | "datetime-local";
  hint?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span className="label">
        {label}
        {required && <span className="req" aria-label="required"> *</span>}
      </span>
      <input id={id} type={type} value={value} placeholder={placeholder} autoComplete={autoComplete} required={required} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function AreaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  rows = 4,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span className="label">
        {label}
        {required && <span className="req" aria-label="required"> *</span>}
      </span>
      <textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span className="label">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function Toggle({ id, label, checked, onChange, hint }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className={`toggle${checked ? " is-on" : ""}`} htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{label}</strong>
        {hint && <span className="hint">{hint}</span>}
      </span>
    </label>
  );
}

export function Chips<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <fieldset className="chips">
      <legend className="label">{label}</legend>
      <div className="chips-row">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              className={`chip${on ? " is-on" : ""}`}
              onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
            >
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
