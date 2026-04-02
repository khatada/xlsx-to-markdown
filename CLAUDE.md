# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業する際のガイドラインを定義します。

## Architecture Decision Records (ADR)

### 参照

設計・実装を行う前に `docs/adr/README.md` を読んで現行の決定事項を確認してください。
ADR の一覧・ステータスは `docs/adr/README.md` が唯一の正とします。

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

4. `docs/adr/README.md` の一覧テーブルに追記する（CLAUDE.md への追記は不要）

## README 更新ルール

以下のいずれかに該当する変更を行った場合は **README.md を必ず更新**してください。

| 変更の種類 | README で更新する箇所 |
| --- | --- |
| 公開 API の追加・変更・削除 | API セクション |
| オプションの追加・変更・削除 | Options セクション・デフォルト値テーブル |
| 領域検出アルゴリズムの変更 | Content Detection セクション |
| テーブル・段落の出力形式変更 | Table Formatting Details / Rich Text セクション |
| 開発コマンドの追加・変更 | Development セクション |

README の更新はコードと同じコミットに含めてください。

## 開発コマンド

```bash
npm test            # テスト実行 (vitest)
npm run build       # TypeScript コンパイル → dist/
npm run test:watch  # ウォッチモードでテスト
npm run lint        # oxlint
npm run fmt         # oxfmt（上書き）
npm run fmt:check   # フォーマット確認（CI 用）
```

## コード規約

- `src/` 配下のソースを編集し `dist/` は直接編集しない（ビルド成果物）
- 公開 API の型は `src/types.ts` に集約する
- テストは `src/__tests__/` に配置し、ファイル名は `*.test.ts`
- 新機能を追加する際は対応するテストも追加する
- **markdown 文字列の検証は `toBe` で完全一致**: `convertWorkbook` が返す `markdown` / `sheets[i].markdown` を検証する際は `toContain` ではなく `toBe` を使って出力全体を比較する

## 現在のアーキテクチャ概要

```
src/
  types.ts              — 全型定義 (ConvertOptions, CellData, Region など)
  options.ts            — デフォルト値を埋めてオプションを確定
  cell-formatter.ts     — セル値の抽出・書式変換
                          rawValue: 生テキスト（HTMLレンダラーが使用）
                          value:    Markdown書式付き（段落レンダラーが使用）
  region-detector.ts    — 行→列→再帰スキャンによるテーブル/段落の領域検出（横並び表対応）
  table-renderer.ts     — HTML テーブル出力 (colspan/rowspan 対応)
  paragraph-renderer.ts — Markdown 段落出力
  sheet-converter.ts    — シート全体の変換オーケストレーション
  index.ts              — 公開 API
```

### 重要な設計ポイント

- **テーブルは HTML 出力**: `<table>`/`<thead>`/`<tbody>` + colspan/rowspan（詳細: `docs/adr/`）
- **段落は Markdown 出力**: プレーンテキスト + `**bold**`, `_italic_` 記法
- **rawValue と value の分離**: `CellData.rawValue` は HTML エスケープ前の生テキスト、`CellData.value` は Markdown 書式適用済みテキスト。テーブルレンダラーは `rawValue` を使い HTML タグを適用する
- **領域検出**: 行→列→再帰スキャン。空列をギャップとして横並び表を分離する。`minColumns` / `minRows` で閾値を調整できる
