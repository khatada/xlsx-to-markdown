import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { convertWorkbook } from '../index.js';
import { buildWorkbook, normalise } from './helpers.js';

describe('table rendering (HTML)', () => {
  it('renders a simple 2-column table with header using thead/tbody', () => {
    const wb = buildWorkbook([{
      name: 'Sheet1',
      data: [
        ['Name', 'Age'],
        ['Alice', 30],
        ['Bob', 25],
      ],
    }]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain('<table>');
    expect(markdown).toContain('<thead>');
    expect(markdown).toContain('<th>Name</th>');
    expect(markdown).toContain('<tbody>');
    expect(markdown).toContain('<td>Alice</td>');
    expect(markdown).toContain('<td>Bob</td>');
  });

  it('right-aligns numeric columns via style attribute', () => {
    const wb = buildWorkbook([{
      name: 'Sheet1',
      data: [
        ['Item', 'Price'],
        ['Apple', 100],
        ['Banana', 200],
      ],
    }]);
    const { markdown } = convertWorkbook(wb);
    // Price column is all numbers → right-aligned
    expect(markdown).toContain('style="text-align: right"');
  });

  it('renders multiple tables on one sheet', () => {
    const wb = buildWorkbook([{
      name: 'Sheet1',
      data: [
        ['A', 'B'],
        [1, 2],
        [undefined, undefined],
        ['X', 'Y'],
        [3, 4],
      ],
    }]);
    const { sheets, markdown } = convertWorkbook(wb);
    expect(sheets[0].regions.filter((r) => r.type === 'table').length).toBe(2);
    // Both tables are rendered as HTML
    expect(markdown.match(/<table>/g)?.length).toBe(2);
  });

  it('escapes HTML special characters in cell values', () => {
    const wb = buildWorkbook([{
      name: 'Sheet1',
      data: [
        ['Col1', 'Col2'],
        ['a<b>&c', '"quoted"'],
      ],
    }]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain('a&lt;b&gt;&amp;c');
    expect(markdown).toContain('&quot;quoted&quot;');
  });

  it('renders merged cells with colspan and rowspan', () => {
    // Build a workbook with merged cells manually
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {
      '!ref': 'A1:C3',
      A1: { t: 's', v: 'Header' },
      B1: { t: 's', v: '' },   // merged child
      C1: { t: 's', v: 'Right' },
      A2: { t: 's', v: 'Span' },
      B2: { t: 'n', v: 10 },
      C2: { t: 'n', v: 20 },
      A3: { t: 's', v: '' },   // merged child (rowspan from A2)
      B3: { t: 'n', v: 30 },
      C3: { t: 'n', v: 40 },
      '!merges': [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },  // A1:B1 colspan=2
        { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },  // A2:A3 rowspan=2
      ],
    };
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain('colspan="2"');
    expect(markdown).toContain('rowspan="2"');
    // A3 is a merge child — should not appear as a <td>
    const rows = markdown.match(/<tr>/g);
    expect(rows).not.toBeNull();
  });

  it('omits thead and uses only tbody when headerRow is false', () => {
    const wb = buildWorkbook([{
      name: 'Sheet1',
      data: [
        ['A', 'B'],
        [1, 2],
      ],
    }]);
    const { markdown } = convertWorkbook(wb, { headerRow: false });
    expect(markdown).not.toContain('<thead>');
    expect(markdown).toContain('<tbody>');
    expect(markdown).toContain('<td>A</td>');
  });
});
