# <img src="public/icon.svg" width="28" height="28" style="vertical-align: middle"> Pixel Extractor

[English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md)

AI生成または不適切に保存されたピクセルアート（例：JPEGアーティファクト）からクリーンなピクセルアートスプライトを抽出するWebベースのツール。[Donitzo's ai-pixelart-extractor](https://github.com/Donitzo/ai-pixelart-extractor) を基に構築されています。

**👉 [オンラインで試す](https://univeous.github.io/Pixel-Extractor/)**

<p align="center">
  <img src="docs/sc1.png" width="80%" />
</p>

## 問題点

AI生成のピクセルアートには、実際のゲームアセットとして使用できない様々なアーティファクトが含まれることがよくあります：

- **色の滲み** - 隣接するピクセル間の不要な色の滲み
- **アンチエイリアスアーティファクト** - 硬いピクセル境界であるべき場所にソフトなエッジやグラデーション
- **グリッドの不一致** - 規則的なグリッドに整列していないピクセル、または非正方形のピクセル比
- **ノイズの多い背景** - 純色ではなく、わずかな色の変化がある背景

既存のツールの多くは、これらの問題をうまく処理できません：
- 単純なリサイズ（最近傍）は問題を小さくするだけ
- 手動ツールはピクセルグリッドサイズを推測する必要がある

## 仕組み

このツールは**エッジ検出**と**グリッドフィッティングアルゴリズム**を使用して、画像をインテリジェントに分析し、元のピクセルグリッドを復元します——単に盲目的にリサイズするのではなく。

- **自動グリッド検出** - ピクセルサイズを手動で入力する必要はありません；アルゴリズムが最適なグリッドを見つけます
- **非正方形ピクセル対応** - XとYのピクセル比が異なる画像を処理（AIアートで一般的）
- **自動スプライト検出** - 複数のスプライトを含む画像を個別のアセットに分割
- **スマートカラー量子化** - 色ノイズをクリーンアップするHistogramまたはK-Meansメソッド
- **背景除去** - 背景色を自動検出または手動指定
- **前後比較** - 抽出品質を検証するインタラクティブスライダー

## はじめに

### 推奨：PWAとしてインストール

最高の体験を得るために、**アプリをPWA**（プログレッシブWebアプリ）としてインストールしてください：

1. [オンラインデモ](https://univeous.github.io/Pixel-Extractor/)にアクセス
2. ブラウザのアドレスバーのインストールボタンをクリック（またはブラウザメニュー → 「アプリをインストール」）
3. 完了！アプリはオフラインで動作し、ネイティブアプリのように感じられます

初回ロードでは約30MBのPythonパッケージ（NumPy、SciPyなど）がダウンロードされ、ローカルにキャッシュされます。その後、アプリは高速にロードされます——オフラインでも。

### UIのヒント

- **ネットワークステータスインジケーター**（右上）：オンライン/オフラインステータスを表示。新しいバージョンが利用可能な場合、更新アイコンが表示されます——クリックして更新します。
- **履歴項目を右クリック**：現在のパラメータで元の画像または結果画像を再処理
- **処理履歴**：IndexedDBにローカルに保存され、セッション間で永続化（ブラウザデータをクリアすると履歴が消去されます）

<details>
<summary><b>ローカルで実行 / セルフホスト</b></summary>

<br>

**前提条件：** Node.js 18+

```bash
# リポジトリをクローン
git clone https://github.com/univeous/Pixel-Extractor.git
cd Pixel-Extractor

# 依存関係をインストール（yarn/pnpm/bunも使用可能）
npm install

# 開発サーバーを実行
npm run dev
```

http://localhost:3000 を開く

**ビルド：**

```bash
npm run build
```

出力は `dist/` フォルダにあります。

**GitHub Pagesにデプロイ：**

1. このリポジトリをFork
2. Settings → Pages → Source: "GitHub Actions" に移動
3. `main` ブランチにプッシュ——自動デプロイされます

アプリは `https://<username>.github.io/Pixel-Extractor/` で利用可能になります

</details>

## スクリーンショット

<p align="center">
  <img src="docs/sc4.png" width="49%" />
  <img src="docs/sc2.png" width="49%" />
</p>
<p align="center">
  <img src="docs/sc5.png" width="49%" />
  <img src="docs/sc3.png" width="49%" />
</p>

## よくある質問

<details>
<summary><b>Histogram vs K-Means：どちらを選ぶべき？</b></summary>

<br>

どちらの方法も普遍的に優れているわけではありません——異なるアートスタイルに適しています。**Histogram**がK-Meansよりも微妙な色の変化をより良く保持する例：

| 元画像 | Histogram | K-Means |
|:--------:|:---------:|:-------:|
| <img src="docs/cmp_orig.png" width="200"> | <img src="docs/cmp_hist.png" width="200"> | <img src="docs/cmp_km.png" width="200"> |

空の領域に注目：元画像には3つの類似しているが異なる青のトーンがあります。

- **Histogram**は色を正しく保持し、微妙なグラデーションを維持
- **K-Means**はそれらを単一の青にマージし、大気の深みを失う

これは、K-Meansがクラスター重心を最適化するため、知覚的に異なるが数値的に近い色を一緒にグループ化する可能性があるためです。Histogramベースの量子化は、画像内の実際の色分布を尊重します。

**ヒント**：両方を試して、どちらが画像に適しているか確認してください——処理は高速です！😉

</details>

<details>
<summary><b>なぜ純粋なTypeScriptではなくPython/WASMを使用するのか？</b></summary>

<br>

コアアルゴリズムは科学計算ライブラリに大きく依存しています：

- **NumPy** - 高速配列操作と線形代数
- **SciPy** - 信号処理（ピーク検出、最適化）
- **scikit-image** - 画像処理（形態学、エッジ検出、ノイズ除去）
- **scikit-learn** - カラー量子化のためのK-Meansクラスタリング

これらすべてをTypeScriptで再実装することは：
1. 大規模な作業（数千行の最適化された数値コード）
2. おそらく遅い（これらのライブラリは高度に最適化されたC/Fortranを使用）
3. 保守が困難（元のアルゴリズムはPythonで書かれている）

[Pyodide](https://pyodide.org/)のおかげで、WebAssemblyを介してブラウザでまったく同じPythonコードを実行できます。トレードオフは約30MBの初期ダウンロード（初回ロード後にキャッシュ）ですが、処理自体はかなり高速です。

</details>

<details>
<summary><b>なぜ初回ロードが遅いのか？</b></summary>

<br>

初回訪問時、アプリは以下をダウンロードする必要があります：
- Pyodideランタイム（~10MB）
- Pythonパッケージ：NumPy、SciPy、scikit-image、scikit-learn（合計~20MB）

これらはService Workerによってキャッシュされるため、その後の訪問（オフラインでも）は即座にロードされます。最高の体験のためにPWAとしてインストールしてください。

</details>

<details>
<summary><b>抽出されたスプライトが正しく見えない</b></summary>

<br>

このツールは魔法の修正ではありません——AI生成のピクセルアートには、アルゴリズムが完全に修正できない根本的な問題（主にグリッドの不一致）がよくあります。

とはいえ、これらのパラメータを調整してみてください：

- **最大色数** - 色の詳細が失われている場合は増やし、ノイズが多すぎる場合は減らす
- **カラーサンプリング / エッジ検出** - HistogramとK-Meansの間で切り替えてみる
- **孤立除去** - より孤立したノイズピクセルを除去するために増やす
- **背景色除去** - 背景が誤って検出されている場合はオフにする

このツールは、作業するための**よりクリーンなベース**を提供すると考えてください。出力はまだ手動での調整が必要な場合がありますが、生のAI出力から始めるよりもはるかに簡単なはずです。

</details>

## 技術スタック

- **フロントエンド**：React + TypeScript + Tailwind CSS
- **処理**：Python（NumPy、SciPy、scikit-image、scikit-learn）がPyodideを介してWebAssemblyで実行
- **ビルド**：Vite

## クレジット

コア抽出アルゴリズムは、Donitzoの [ai-pixelart-extractor](https://github.com/Donitzo/ai-pixelart-extractor) を基にしています。
