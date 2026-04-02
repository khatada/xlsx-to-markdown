# ADR-0014: 罫線・autofilter 条件を満たす空セルを非空として扱う

## ステータス

採用済み

## コンテキスト

Excel の ListObject（テーブル書式）を含むシートを変換すると、テーブル内の空セルが
「空行」と見なされてテーブルが分断されたり、列密度が低下して段落と誤分類される問題が
あった。

具体的には以下の 2 つのケースで誤検出が発生していた。

1. **左右両方の縦罫線を持つ空セル** — Excel テーブルスタイルでは列境界を示す縦罫線が
   適用されることが多い。値を持たないセルにも罫線が付いているため、密度計算から除外
   されるとテーブルが分断される。

2. **`!autofilter` 範囲内の空セル** — SheetJS は Excel ListObject のメタデータを
   `ws["!autofilter"].ref` に展開する。ListObject は必ずオートフィルタを持つため、
   このプロパティの存在がテーブル範囲の信頼できるシグナルになる。

## 決定

`sheet-converter.ts` の `filledCols` 構築ループに以下の 2 条件を追加し、値のない
セルでもこれらを満たす場合は `filledCols` に追加して密度計算に含める。

### 条件 A — 左右両側の縦罫線（`useBorders` 有効時のみ）

```typescript
if (
  opts.tableDetection.useBorders &&
  b.left?.style &&
  b.right?.style &&
  !filledCols.has(c)
) {
  filledCols.add(c);
  filledCount++;
}
```

- **左右両方** の罫線スタイルが存在する場合のみ適用する（片側のみは対象外）。
- `useBorders: false` の場合は適用しない。

### 条件 B — `!autofilter` 範囲内

```typescript
const autofilterRange = ws["!autofilter"]?.ref
  ? XLSX.utils.decode_range(ws["!autofilter"].ref)
  : null;

// ...

} else if (inAutofilter && !filledCols.has(c)) {
  filledCols.add(c);
  filledCount++;
}
```

- オートフィルタは ListObject 以外（通常のオートフィルタ）にも付与できるが、
  その場合もテーブルとして扱う方が自然であるため、区別せず適用する。
- `useBorders` の設定に関わらず常に有効。

## 結果

- **改善**: Excel ListObject を含むシートでテーブルが正しく 1 つの領域として検出される。
- **トレードオフ**: `!autofilter` が設定された範囲は、ユーザーの意図に関係なくテーブル
  として扱われる。オートフィルタのみ（ListObject でない）のシートでも同様に適用される。
- **将来の改善点**: SheetJS が `xl/tables/*.xml` を解析して `ws["!tables"]` を提供
  するようになれば、より正確な ListObject 検出に切り替えられる。
