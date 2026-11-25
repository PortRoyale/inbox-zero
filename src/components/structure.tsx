// Structured layouts. Rule: any group of related items sits in a structure with a header and
// aligned columns (a table, a labelled option grid or a numbered register), never a free-wrapping
// row of chips. See DESIGN.md, "Structure, not chip clouds".

export type Col<T> = {
  key: string;
  label: string;
  /** CSS width for the column, e.g. "9rem" or "30%". Omit for flexible. */
  width?: string;
  /** Monospace cell, for references, dates and codes. */
  code?: boolean;
  /** Row header (scope="row"); usually the first column. */
  head?: boolean;
  /** Hide the label on phones when the value speaks for itself. */
  bare?: boolean;
  render: (row: T, index: number) => React.ReactNode;
};

export type Group<T> = { label: React.ReactNode; rows: T[]; note?: React.ReactNode };

/**
 * A drawing-register table: column headers, fixed columns, optional row groups.
 * On phones each row becomes a labelled block, so no horizontal scrolling is needed.
 */
export function SpecTable<T>({
  cols,
  rows,
  groups,
  caption,
  rowKey,
  className = "",
  numbered = false,
  rowClass,
}: {
  cols: Col<T>[];
  rows?: T[];
  groups?: Group<T>[];
  caption?: React.ReactNode;
  rowKey: (row: T, index: number) => string;
  className?: string;
  numbered?: boolean;
  rowClass?: (row: T) => string | undefined;
}) {
  const sets: Group<T>[] = groups ?? [{ label: null, rows: rows ?? [] }];
  let n = 0;
  const span = cols.length + (numbered ? 1 : 0);
  return (
    <div className={`spec ${className}`}>
      <table>
        {caption && <caption>{caption}</caption>}
        <colgroup>
          {numbered && <col style={{ width: "3.25rem" }} />}
          {cols.map((c) => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {numbered && (
              <th scope="col" className="spec-no">
                No.
              </th>
            )}
            {cols.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        {sets.map((g, gi) => (
          <tbody key={gi}>
            {g.label !== null && (
              <tr className="spec-group">
                <th colSpan={span} scope="colgroup">
                  <span>{g.label}</span>
                  {g.note && <span className="spec-group-note">{g.note}</span>}
                </th>
              </tr>
            )}
            {g.rows.map((row) => {
              const i = n++;
              return (
                <tr key={rowKey(row, i)} className={rowClass?.(row)}>
                  {numbered && (
                    <td className="spec-no code" data-label="No.">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                  )}
                  {cols.map((c) => {
                    const Cell = c.head ? "th" : "td";
                    return (
                      <Cell key={c.key} scope={c.head ? "row" : undefined} data-label={c.bare ? undefined : c.label} className={c.code ? "code" : undefined}>
                        {c.render(row, i)}
                      </Cell>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export type Option<T extends string> = { value: T; label: string; hint?: string };

/**
 * Multi-select as an aligned grid of equal checkbox cells, optionally grouped with a label column.
 * Replaces chip rows: every option has the same width, so the eye reads columns, not a ragged line.
 */
export function OptionGrid<T extends string>({
  id,
  legend,
  required,
  options,
  groups,
  selected,
  onChange,
  columns = 4,
  note,
}: {
  id: string;
  legend: React.ReactNode;
  required?: boolean;
  options?: Option<T>[];
  groups?: { label: string; options: Option<T>[] }[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
  columns?: 2 | 3 | 4;
  note?: React.ReactNode;
}) {
  const toggle = (v: T) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const cell = (o: Option<T>) => {
    const on = selected.includes(o.value);
    const inputId = `${id}-${o.value.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    return (
      <label key={o.value} className={`opt${on ? " is-on" : ""}`} htmlFor={inputId}>
        <input id={inputId} type="checkbox" checked={on} onChange={() => toggle(o.value)} />
        <span className="opt-text">
          <span className="opt-label">{o.label}</span>
          {o.hint && <span className="opt-hint">{o.hint}</span>}
        </span>
      </label>
    );
  };
  const count = selected.length;
  const total = groups ? groups.reduce((a, g) => a + g.options.length, 0) : (options?.length ?? 0);
  return (
    <fieldset className="optgrid" style={{ ["--opt-cols" as string]: columns }}>
      <legend>
        <span className="label">
          {legend}
          {required && <span className="req"> *</span>}
        </span>
        <span className="optgrid-count code">
          {count}/{total} selected
        </span>
      </legend>
      {groups ? (
        <div className="optgroups">
          {groups.map((g) => (
            <div key={g.label} className="optgroup">
              <p className="optgroup-label">{g.label}</p>
              <div className="opt-cells">{g.options.map(cell)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="opt-cells">{options?.map(cell)}</div>
      )}
      {note && <p className="optgrid-note">{note}</p>}
    </fieldset>
  );
}

export type CheckRow = { id: string; label: React.ReactNode; hint?: React.ReactNode; basis?: React.ReactNode; checked: boolean; onChange: (v: boolean) => void };

/** Yes/no statements as one aligned checklist: box, statement, and the rule it comes from. */
export function CheckList({ legend, rows, basisLabel = "Basis" }: { legend: React.ReactNode; rows: CheckRow[]; basisLabel?: string }) {
  const withBasis = rows.some((r) => r.basis);
  return (
    <fieldset className={`checklist${withBasis ? " has-basis" : ""}`}>
      <legend className="label">{legend}</legend>
      <div className="checklist-head" aria-hidden="true">
        <span>Done</span>
        <span>Statement</span>
        {withBasis && <span>{basisLabel}</span>}
      </div>
      {rows.map((r) => (
        <label key={r.id} className={`check-row${r.checked ? " is-on" : ""}`} htmlFor={r.id}>
          <input id={r.id} type="checkbox" checked={r.checked} onChange={(e) => r.onChange(e.target.checked)} />
          <span className="check-text">
            <span className="check-label">{r.label}</span>
            {r.hint && <span className="check-hint">{r.hint}</span>}
          </span>
          {withBasis && <span className="check-basis code">{r.basis}</span>}
        </label>
      ))}
    </fieldset>
  );
}

export type Reference = { ref: string; doc: string; kind: string; use: string; href?: string };

/** Reference documents block, as on an engineering drawing. */
export function RefTable({ refs, caption }: { refs: Reference[]; caption?: React.ReactNode }) {
  return (
    <SpecTable
      className="spec-refs"
      caption={caption}
      rows={refs}
      rowKey={(r) => r.ref}
      cols={[
        { key: "ref", label: "Ref", width: "4.5rem", code: true, render: (r) => r.ref },
        {
          key: "doc",
          label: "Document",
          width: "34%",
          head: true,
          render: (r) =>
            r.href ? (
              <a href={r.href} rel="noopener noreferrer" target="_blank">
                {r.doc}
              </a>
            ) : (
              r.doc
            ),
        },
        { key: "kind", label: "Type", width: "11rem", code: true, render: (r) => r.kind },
        { key: "use", label: "What it covers", render: (r) => r.use },
      ]}
    />
  );
}
