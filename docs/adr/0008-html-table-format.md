# ADR-0008: テーブル出力形式を HTML に変更し colspan/rowspan を完全サポートする

## ステータス

採用済み  
ADR-0003 (GFM テーブル形式) および ADR-0005 (マージセルを空セルで代替) を差し替える。

## コンテキスト

[ADR-0003](0003-markdown-table-format.md) で GFM テーブル形式を採用したが、以下の制約が顕在化した：

- **マージセルを表現できない**: GFM テーブルには colspan/rowspan の構文がなく、[ADR-0005](0005-merged-cell-handling.md) ではマージ子セルを空セルで代替する設計を採っていた。これにより、ヘッダースパンや縦方向の結合を持つ Excel 表が Markdown 上で不正確に表示される問題があった
- **実ビジネス文書での頻度**: 請求書・報告書など実際の Excel ファイルではセル結合が多用されており、情報の欠損が許容できないケースが多い

Markdown ドキュメント内に HTML を埋め込むことは CommonMark 仕様上許可されており、GitHub・GitLab・Notion・主要な静的サイトジェネレーターはいずれも Markdown 内の HTML テーブルをレンダリングする。

## 決定

テーブル領域を **HTML テーブル** (`<table>`) として出力するよう変更する。

### 出力構造

```html
<table>
  <thead>
    <tr>
      <th>名前</th>
      <th colspan="2">期間</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">Alice</td>
      <td style="text-align: right">Q1</td>
      <td style="text-align: right">Q2</td>
    </tr>
    <tr>
      <td style="text-align: right">100</td>
      <td style="text-align: right">200</td>
    </tr>
  </tbody>
</table>
```

### マージセルの扱い

- マージ範囲の左上マスターセルに `colspan` / `rowspan` 属性を付与する
- マージ子セル（マスター以外）は `<td>` / `<th>` 要素を**出力しない**（要素を省略することで colspan/rowspan が正しく機能する）

### ヘッダー行

- `headerRow: true`（デフォルト）: 先頭行を `<thead>` 内の `<th>` としてレンダリング
- `headerRow: false`: `<thead>` を出力せず全行を `<tbody>` 内の `<td>` としてレンダリング

### アライメント

- 数値列の自動右揃え推論（[ADR-0004](0004-column-alignment-inference.md)）は維持
- 配置は GFM のセパレータ記法ではなく `style="text-align: right/center"` 属性で表現
- デフォルト（左揃え）は `style` 属性を省略してシンプルに保つ

### HTML エスケープ

セル値内の `&` → `&amp;`、`<` → `&lt;`、`>` → `&gt;`、`"` → `&quot;` をエスケープする。

### リッチテキスト

段落レンダラーは引き続き Markdown 記法（`**bold**`, `_italic_`）を使用するため、`CellData` に `rawValue`（書式未適用の生テキスト）フィールドを追加し、テーブルレンダラーはこれをもとに HTML タグ（`<strong>`, `<em>`, `<a>`）を付与する。

| 書式 | HTML 出力 |
| --- | --- |
| 太字 | `<strong>text</strong>` |
| イタリック | `<em>text</em>` |
| 太字 + イタリック | `<strong><em>text</em></strong>` |
| ハイパーリンク | `<a href="url">text</a>` |

## 結果

### メリット

- Excel のセル結合（colspan/rowspan）を完全に再現できる
- GitHub、GitLab、Notion などの主要ツールで正確にレンダリングされる
- 将来的に `<colgroup>` による列幅指定など追加のスタイリングが可能

### トレードオフ

- **可読性の低下**: GFM テーブルと比較して Markdown ファイル上でプレーンテキストとして読む場合に見づらい
- **パーサー依存**: HTML ブロックをサポートしない一部の Markdown パーサーでは `<table>` がそのまま表示される可能性がある。ただし CommonMark 準拠のパーサーは全てサポートする
- **インデント**: 読みやすさのため 2 スペースインデントで出力するが、ミニファイ要件がある場合は別途処理が必要
