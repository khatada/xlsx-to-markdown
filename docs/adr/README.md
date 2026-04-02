# Architecture Decision Records

このディレクトリには xlsx-to-md ライブラリの設計上の決定事項を ADR (Architecture Decision Record) 形式で記録します。

## 一覧

| # | タイトル | ステータス |
| --- | --- | --- |
| [0001](0001-xlsx-parsing-library.md) | XLSXパースライブラリに SheetJS (xlsx) を採用する | 採用済み |
| [0002](0002-region-detection-algorithm.md) | 領域検出アルゴリズムに「行密度スキャン」を採用する | 差し替え済み (by 0010) |
| [0010](0010-recursive-region-detection.md) | 領域検出を「行→列→再帰スキャン」に変更して横並び表を分離する | 採用済み |
| [0004](0004-column-alignment-inference.md) | 数値列を自動で右揃えに推論する | 採用済み |
| [0006](0006-multi-sheet-headings.md) | 複数シートがある場合に "## シート名" 見出しを自動挿入する | 採用済み |
| [0007](0007-rich-text-handling.md) | リッチテキストはセルスタイルから読み取り、XMLパースは行わない | 採用済み |
| [0008](0008-html-table-format.md) | テーブル出力形式を HTML に変更し colspan/rowspan を完全サポートする | 採用済み |
| [0009](0009-linter-and-formatter.md) | リンターに oxlint、フォーマッターに oxfmt を採用する | 採用済み |
| [0011](0011-border-based-table-boundary-detection.md) | 縦罫線（左右）を表境界検出の主要シグナルとして使用する | 採用済み |
| [0012](0012-exclude-hidden-rows-and-columns.md) | 非表示行・列を変換出力から除外する | 採用済み |
| [0013](0013-hyperlink-formula-extraction.md) | =HYPERLINK() 数式からリンク先 URL を抽出する | 採用済み |
| [0014](0014-treat-bordered-and-autofiltered-empty-cells-as-non-empty.md) | 罫線・autofilter 条件を満たす空セルを非空として扱う | 採用済み |

## ADR の形式

各 ADR は以下のセクションで構成されています：

- **ステータス**: 採用済み / 廃止 / 差し替え済み (by ADR-XXXX)
- **コンテキスト**: 決定が必要になった背景と要件
- **決定**: 何を選択したか、その理由
- **結果**: この決定によって生じるトレードオフや制約
