import { Fragment } from "react";

export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,3}) (.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const Tag = (`h${level + 1}` as "h2" | "h3" | "h4");
      blocks.push(<Tag key={i}>{inline(heading[2])}</Tag>);
      i++;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const [head, , ...body] = rows;
      blocks.push(
        <div className="table-scroll doc-table" key={`t${i}`}>
          <table className="drawing">
            <thead>
              <tr>
                {head.map((h, k) => (
                  <th key={k} scope="col">
                    {inline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, k) => (
                <tr key={k}>
                  {r.map((c, m) => (
                    <td key={m}>{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={`l${i}`} className="doc-list">
          {items.map((it, k) => (
            <li key={k}>{inline(it)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.trim() === "---") {
      blocks.push(<hr key={i} />);
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||- |---)/.test(lines[i])) {
      para.push(lines[i].replace(/ {2}$/, ""));
      i++;
    }
    blocks.push(
      <p key={`p${i}`}>
        {para.map((p, k) => (
          <Fragment key={k}>
            {k > 0 && <br />}
            {inline(p)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className="doc">{blocks}</div>;
}

function splitRow(row: string) {
  return row
    .replace(/^\|\s?/, "")
    .replace(/\s?\|$/, "")
    .split(/(?<!\\)\s\|\s/)
    .map((c) => c.replace(/\\\|/g, "|"));
}

function inline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[GAP: [^\]]+\])/g).filter(Boolean);
  return parts.map((part, k) => {
    if (part.startsWith("**")) return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={k} className="code">{part.slice(1, -1)}</code>;
    if (part.startsWith("[GAP:")) return <mark key={k} className="doc-gap">{part.slice(1, -1)}</mark>;
    return <Fragment key={k}>{part}</Fragment>;
  });
}
