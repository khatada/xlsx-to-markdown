# ADR-0013: Extract destination URL from =HYPERLINK() formula

## Status

Accepted

## Context

There are two ways to set hyperlinks in Excel:

1. **Cell link (`cell.l`)**: Attach a hyperlink directly to a cell. SheetJS provides the URL via `cell.l.Target`.
2. **HYPERLINK formula**: Enter the function `=HYPERLINK("url", "display text")` as a formula. In this case SheetJS does not set `cell.l`, but the formula string is stored in `cell.f`.

The previous implementation only referenced `cell.l`, so links via HYPERLINK formulas were not turned into links in Markdown output — only the display text was output.

## Decision

If `cell.l` does not exist, match `cell.f` (formula string) against the regex `/^HYPERLINK\s*\(\s*"([^"]+)"/i` and extract the first argument (URL) for use as the hyperlink.

```
=HYPERLINK("https://example.com", "text")
               ↑ extract this part
```

If `cell.l` exists, `cell.l.Target` takes priority and formula parsing is skipped.

### Unsupported forms

- If the URL is a cell reference (e.g., `=HYPERLINK(A1, "text")`), extraction is not possible. Output as text without a link
- If the URL contains spaces (cases where `"` appears inside double quotes), the regex will not match and only the text is output

## Consequences

### Benefits

- Links set via HYPERLINK formula are output in Markdown as `[text](url)` format
- Priority with `cell.l` is clear: `cell.l` always takes precedence

### Trade-offs

- Formula string parsing uses a simple regex and does not handle complex formulas (nesting, indirect references, etc.)
- `cell.f` only exists when SheetJS retains the formula. The formula may be lost depending on the file format
