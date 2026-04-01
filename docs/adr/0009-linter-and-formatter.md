# ADR-0009: リンターに oxlint、フォーマッターに oxfmt を採用する

## ステータス

採用済み

## コンテキスト

コードの品質統一と一貫したスタイル維持のため、リンターとフォーマッターを導入する必要がある。TypeScript プロジェクトで一般的な選択肢は以下の通り：

| ツール | 役割 | 実装言語 | 備考 |
| --- | --- | --- | --- |
| ESLint + Prettier | リント + フォーマット | JavaScript | デファクトスタンダード。設定が複雑になりがち |
| Biome | リント + フォーマット | Rust | 高速。ESLint 互換ルールを多数持つ |
| oxlint | リント | Rust | Oxc プロジェクト製。ESLint 互換 |
| oxfmt | フォーマット | Rust | Oxc プロジェクト製。Prettier 互換設定に対応 |

## 決定

**リンターに oxlint、フォーマッターに oxfmt** を採用する。

理由：

1. **高速**: いずれも Rust 製で、ESLint/Prettier と比較して数十倍高速に動作する
2. **互換性**: oxlint は ESLint v8 の設定形式に準拠し、oxfmt は Prettier の設定からマイグレーション可能。既存の知識が流用できる
3. **同一エコシステム**: 同じ Oxc プロジェクトのツールのため、将来的な統合（LSP 等）が期待できる
4. **設定の軽量さ**: `.oxlintrc.json` / `.oxfmtrc.json` はデフォルトで実用的な設定が得られる

### 有効にしたルールカテゴリ (oxlint)

`correctness`（デフォルト）のみを `error` として有効化し、`suspicious` / `pedantic` 等は無効のままとする。過剰なノイズを避け、明らかに誤りのあるコードのみを検出する方針。

プラグイン:
- `typescript` — TypeScript 固有のルール
- `unicorn` — モダンな JavaScript/TypeScript の慣用パターン
- `oxc` — Oxc 独自ルール

### npm scripts

| スクリプト | コマンド | 用途 |
| --- | --- | --- |
| `lint` | `oxlint src/` | リント（CI・ローカル共通） |
| `lint:fix` | `oxlint src/ --fix` | 自動修正 |
| `fmt` | `oxfmt src/` | フォーマット適用 |
| `fmt:check` | `oxfmt src/ --check` | フォーマット確認（CI 用） |

## 結果

- ESLint は `package.json` のスクリプトから削除した（依存パッケージとして存在していなかったため影響なし）
- oxlint は ESLint の全ルールを網羅していないため、将来的に ESLint でしか検出できないルールが必要になった場合は両立を検討する
- oxfmt の設定（`.oxfmtrc.json`）はデフォルトのままとしており、必要に応じて `printWidth` や `tabWidth` を調整できる
