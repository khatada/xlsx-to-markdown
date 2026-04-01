# ADR-0010: 領域検出を「行→列→再帰スキャン」に変更して横並び表を分離する

## ステータス

採用済み  
[ADR-0002](0002-region-detection-algorithm.md)（行密度スキャン）を差し替える。

## コンテキスト

[ADR-0002](0002-region-detection-algorithm.md) で採用した「行密度スキャン」は、同じ行範囲に複数の表が横に並んでいるケース（例: 左にメンバー表、右に売上表）を1つの大きなテーブルとして誤検出していた。

```
     A     B     C          E     F     G
1  Name  Score Grade       Item   Qty  Price
2  Alice   90    A         Apple   5    100
3  Bob     75    B         Banana  3     60
```

列 D が空にもかかわらず、行密度スキャンでは各行の `filledCount` が6になるため、A1:G3 が1つのテーブルとして検出されてしまっていた。

## 決定

領域検出アルゴリズムを **行→列→再帰スキャン** に変更する。

### アルゴリズム

```
detectInRange(rows, colStart, colEnd, opts):
  1. 空行でバンドに分割（連続する非空行のグループ）
  
  2. バンドごとに列ギャップを検出：
       filledCols = バンド内の全行の filledCols の和集合（colStart..colEnd に限定）
       subRanges  = filledCols を連続する列グループに分割
                    （2列以上離れたら別グループ）
  
  3. subRanges が複数 → 各列サブレンジに対して detectInRange を再帰呼び出し
     subRanges が1つ  → classifyBand(band, subRange) で行密度によって分類
  
classifyBand(band, colStart, colEnd, opts):
  - dense 行（filledCount in range ≥ minColumns）が minRows 以上連続 → テーブル
  - それ以外                                                          → 段落
```

### 列ギャップの定義

列インデックスが隣接（差=1）している場合は同じグループ。差が2以上の場合はギャップとみなし別グループに分割する。

### 再帰の終了条件

`subRanges` が1つ（列ギャップなし）になった時点で `classifyBand` を呼び出して終了する。これにより、無限ループは発生しない。

## 結果

### メリット

- 横並びの表が独立したテーブル領域として正しく検出される
- 同じロジックを再帰的に適用するため、複雑なレイアウト（横並びの表の上に見出し、など）にも対応できる
- スタイル情報に依存しない

### トレードオフ

- 行密度スキャンより実装が複雑になる
- 1列おきに並ぶデータ（例: 列 A, C, E に値があり B, D は空）は複数の段落として分割される。これは意図的な挙動だが、そのようなレイアウトには対応できない
- `minColumns` の判定が「列範囲内のセル数」ベースになるため、列サブレンジが狭い（2列）場合に片方のセルが空だと段落に格下げされることがある。この場合は `minColumns: 1` に下げるか、元の Excel でデータを揃えることで回避できる
