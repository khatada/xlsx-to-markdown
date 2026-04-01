import { describe, it, expect } from 'vitest';
import { convertWorkbook } from '../index.js';
import { buildWorkbook } from './helpers.js';

describe('multi-sheet handling', () => {
  it('adds ## headings when there are multiple sheets', () => {
    const wb = buildWorkbook([
      { name: 'Alpha', data: [['a', 'b'], [1, 2]] },
      { name: 'Beta',  data: [['x', 'y'], [3, 4]] },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).toContain('## Alpha');
    expect(markdown).toContain('## Beta');
  });

  it('does NOT add headings for a single sheet', () => {
    const wb = buildWorkbook([
      { name: 'Only', data: [['a', 'b'], [1, 2]] },
    ]);
    const { markdown } = convertWorkbook(wb);
    expect(markdown).not.toContain('## Only');
  });

  it('respects the sheetHeadings: false option', () => {
    const wb = buildWorkbook([
      { name: 'Alpha', data: [['a', 'b'], [1, 2]] },
      { name: 'Beta',  data: [['x', 'y'], [3, 4]] },
    ]);
    const { markdown } = convertWorkbook(wb, { sheetHeadings: false });
    expect(markdown).not.toContain('## Alpha');
    expect(markdown).not.toContain('## Beta');
  });

  it('filters sheets by name', () => {
    const wb = buildWorkbook([
      { name: 'Alpha', data: [['a', 'b'], [1, 2]] },
      { name: 'Beta',  data: [['x', 'y'], [3, 4]] },
      { name: 'Gamma', data: [['p', 'q'], [5, 6]] },
    ]);
    const { sheets } = convertWorkbook(wb, { sheets: ['Alpha', 'Gamma'] });
    expect(sheets.map((s) => s.name)).toEqual(['Alpha', 'Gamma']);
  });

  it('filters sheets by index', () => {
    const wb = buildWorkbook([
      { name: 'Alpha', data: [['a', 'b'], [1, 2]] },
      { name: 'Beta',  data: [['x', 'y'], [3, 4]] },
    ]);
    const { sheets } = convertWorkbook(wb, { sheets: [0] });
    expect(sheets.map((s) => s.name)).toEqual(['Alpha']);
  });
});
