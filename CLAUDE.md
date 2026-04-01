# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業する際のガイドラインを定義します。

## Architecture Decision Records (ADR)

### 参照

設計・実装を行う前に、関連する ADR を必ず確認してください。

```
docs/adr/
  README.md                          — ADR 一覧と索引
  0001-xlsx-parsing-library.md       — XLSX パースライブラリの選定
  0002-region-detection-algorithm.md — テーブル/段落の領域検出アルゴリズム
  0003-markdown-table-format.md      — Markdown テーブル出力形式
  0004-column-alignment-inference.md — 列アライメントの自動推論
  0005-merged-cell-handling.md       — マージセルの扱い
  0006-multi-sheet-headings.md       — 複数シート時の見出し挿入
  0007-rich-text-handling.md         — リッチテキストの取得方法
```

### 更新ルール

以下のいずれかに該当する変更を行う場合は、ADR を作成または更新してください。

| 変更の種類 | 対応 |
| --- | --- |
| 新しい設計上の決定（ライブラリ選定・アルゴリズム・データ構造など） | 新規 ADR を追加 |
| 既存の決定を覆す変更 | 既存 ADR のステータスを「差し替え済み (by ADR-XXXX)」に更新し、新規 ADR を追加 |
| 既存の決定の範囲内での実装変更 | ADR の更新不要。コード・テストのみ変更 |
| バグ修正 | ADR の更新不要 |

### 新規 ADR の作成手順

1. `docs/adr/` の最大番号 + 1 で連番を採番する
2. ファイル名: `NNNN-kebab-case-title.md`
3. 以下のテンプレートを使用する

```markdown
# ADR-NNNN: タイトル

## ステータス

採用済み

## コンテキスト

<!-- 決定が必要になった背景・要件・制約 -->

## 決定

<!-- 何を選択したか。選択肢の比較を含めることを推奨 -->

## 結果

<!-- この決定によって生じるトレードオフ・制約・将来の改善点 -->
```

4. `docs/adr/README.md` の一覧テーブルに追記する

## 開発コマンド

```bash
npm test          # テスト実行 (vitest)
npm run build     # TypeScript コンパイル → dist/
npm run test:watch  # ウォッチモードでテスト
```

## コード規約

- `src/` 配下のソースを編集し `dist/` は直接編集しない（ビルド成果物）
- 公開 API の型は `src/types.ts` に集約する
- テストは `src/__tests__/` に配置し、ファイル名は `*.test.ts`
- 新機能を追加する際は対応するテストも追加する
