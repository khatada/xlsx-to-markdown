# Architecture Decision Records

このディレクトリには xlsx-to-md ライブラリの設計上の決定事項を ADR (Architecture Decision Record) 形式で記録します。

## 一覧

| # | タイトル | ステータス |
| --- | --- | --- |
| [0001](0001-xlsx-parsing-library.md) | XLSXパースライブラリに SheetJS (xlsx) を採用する | 採用済み |
| [0002](0002-region-detection-algorithm.md) | 領域検出アルゴリズムに「行密度スキャン」を採用する | 採用済み |
| [0003](0003-markdown-table-format.md) | テーブル出力形式に GFM テーブルを採用する | 差し替え済み (by 0008) |
| [0004](0004-column-alignment-inference.md) | 数値列を自動で右揃えに推論する | 採用済み |
| [0005](0005-merged-cell-handling.md) | マージセルはマスターセルにコンテンツを保持し子セルを空にする | 差し替え済み (by 0008) |
| [0006](0006-multi-sheet-headings.md) | 複数シートがある場合に "## シート名" 見出しを自動挿入する | 採用済み |
| [0007](0007-rich-text-handling.md) | リッチテキストはセルスタイルから読み取り、XMLパースは行わない | 採用済み |
| [0008](0008-html-table-format.md) | テーブル出力形式を HTML に変更し colspan/rowspan を完全サポートする | 採用済み |

## ADR の形式

各 ADR は以下のセクションで構成されています：

- **ステータス**: 採用済み / 廃止 / 差し替え済み (by ADR-XXXX)
- **コンテキスト**: 決定が必要になった背景と要件
- **決定**: 何を選択したか、その理由
- **結果**: この決定によって生じるトレードオフや制約
