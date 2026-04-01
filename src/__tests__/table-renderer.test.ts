import { describe, it, expect } from 'vitest';
import { convertWorkbook } from '../index.js';
import { buildWorkbook, normalise } from './helpers.js';

describe('table rendering', () => {
  it('renders a simple 2-column table with header', () => {
    const wb = buildWorkbook([{
      name: 'Sheet1',
      data: [
        ['Name', 'Age'],
        ['Alice', 30],
        ['Bob', 25],
      ],
    }]);
    const { markdown } = convertWorkbook(wb);
    const md = normalise(markdown);
    expect(md).toContain('| Name | Age |');
    expect(md).toContain('| --- | ---: |'); // Age column is numeric → right-aligned
    expect(md).toContain('| Alice | 30 |');
    expect(md).toContain('| Bob | 25 |');
  });

  it('right-aligns numeric columns', () => {
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
    expect(markdown).toContain('---:');
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
    const { sheets } = convertWorkbook(wb);
    expect(sheets[0].regions.filter((r) => r.type === 'table').length).toBe(2);
  });

  it('renders pipe characters in cells escaped', () => {
    const wb = buildWorkbook([{
      name: 'Sheet1',
      data: [
        ['Col1', 'Col2'],
        ['a|b', 'c'],
      ],
    }]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain('a\\|b');
  });
});
