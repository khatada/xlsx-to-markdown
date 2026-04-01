---
name: adr
description: >
  Read, create, or supersede Architecture Decision Records (ADRs) in this
  project. Trigger on any of: "/adr", "ADRを作成", "ADRを追加", "ADRを更新",
  "ADRを読む", "設計決定を記録", "アーキテクチャ決定".
  Also trigger proactively when the user makes a design decision that should
  be documented (new library choice, algorithm change, format change, etc.).
---

# ADR Skill

ADR ファイルは `docs/adr/` に置かれる。操作前に必ず `docs/adr/README.md` を
読んで現在の番号・ステータスを確認すること。

## サブコマンドと引数

ユーザーの指示から意図を読み取り、以下のいずれかを実行する。

| 呼び出し例 | 実行する操作 |
|---|---|
| `/adr list` | 一覧表示 |
| `/adr read 0008` | 指定 ADR を表示 |
| `/adr new "タイトル"` | 新規 ADR を作成 |
| `/adr supersede 0003 "新タイトル"` | 既存を差し替えて新規作成 |
| `/adr delete 0003` | 差し替え済み ADR を削除 |

---

## 操作: list

1. `docs/adr/README.md` を読む
2. 内容をそのまま表示する

---

## 操作: read <番号>

1. `docs/adr/` を glob して該当ファイルを特定する（番号が前方一致）
2. ファイルを読んで内容を表示する

---

## 操作: new <タイトル>

### ステップ 1 — 採番

`docs/adr/README.md` の一覧から現在の最大番号を読み取り、+1 した4桁ゼロ埋め番号
`NNNN` を決める。

### ステップ 2 — ファイル作成

パス: `docs/adr/NNNN-<タイトルをkebab-case化>.md`

テンプレート:

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

ユーザーから内容の指示がある場合はセクションを埋める。なければテンプレートのまま
作成してユーザーに編集を促す。

### ステップ 3 — インデックス更新

`docs/adr/README.md` の一覧テーブルに行を追記する:

```
| [NNNN](NNNN-filename.md) | タイトル | 採用済み |
```

---

## 操作: supersede <旧番号> <新タイトル>

### ステップ 1 — 旧 ADR のステータス更新

`docs/adr/<旧番号>-*.md` を読み、ステータス行を以下に書き換える:

```
差し替え済み (by [ADR-NNNN](NNNN-new-filename.md))
```

`NNNN` は次のステップで決まる新番号を使う。

### ステップ 2 — 新 ADR を作成

「操作: new」と同じ手順で作成する。「コンテキスト」セクションに旧 ADR との関係を
明記すること:

```
[ADR-旧番号](旧ファイル名.md) で〇〇を採用したが、△△という理由で変更が必要になった。
```

### ステップ 3 — インデックス更新

`docs/adr/README.md` の旧番号行のステータスを「差し替え済み (by NNNN)」に更新し、
新番号行を追加する。

---

## 操作: delete <番号>

差し替え済みになった ADR ファイルを削除し、インデックスからも除去する。

### ステップ 1 — 前提確認

対象 ADR のステータスが「差し替え済み」であることを確認する。
「採用済み」の ADR は削除しない（ユーザーに確認を求める）。

### ステップ 2 — ファイル削除

`docs/adr/<番号>-*.md` を削除する。

### ステップ 3 — インデックス更新

`docs/adr/README.md` から該当行を削除する。

---

## 共通ルール

- 操作後は必ず変更ファイルを git commit する（メッセージ例: `docs: add ADR-NNNN ...`）
- コミット後に push するかどうかはユーザーに確認する
- ADR の一覧・ステータスの正は `docs/adr/README.md` のみ。CLAUDE.md には ADR インデックスを記載しない
- ADR の内容を勝手に書きすぎない。コンテキストが不明な場合はユーザーに質問する
- タイトルの kebab-case 変換: 日本語タイトルは英語に意訳してから変換する
