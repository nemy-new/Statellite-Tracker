# Satellite Tracker

リアルタイムで人工衛星を追跡し、3Dの地球儀上に可視化するWebアプリケーションです。
Google Gemini AIと連携し、選択した衛星に関する詳細なインテリジェンス・レポートを生成することも可能です。

## 主な機能

* **リアルタイム衛星追跡**: 衛星の位置をリアルタイムで計算（`satellite.js`使用）し、3D地球儀上に表示します。
* **インタラクティブな3D地球儀**: `Three.js` (@react-three/fiber) を使用した地球儀。拡大・縮小・回転が可能です。
* **多様な地球儀スタイル**: ホログラフィック、ワイヤーフレーム、アウトラインなど、複数の表示スタイルを切り替えられます。
* **強力なフィルタリング**: カテゴリ（宇宙ステーション、GPSなど）、高度、名前で衛星を絞り込めます。
* **AIによるレポート生成**: Google Gemini APIを利用し、選択した衛星の目的や現状に関するレポートをオンデマンドで生成します。
* **多言語対応**: UIは英語と日本語に対応しています。
* **レスポンシブデザイン**: デスクトップでもモバイルでも最適化されたUI（スライド式パネルなど）を搭載しています。

## 使用技術

* **フロントエンド**: React, TypeScript, Vite
* **3D描画**: Three.js, @react-three/fiber, @react-three/drei
* **衛星軌道計算**: satellite.js
* **AI**: Google Gemini API (@google/genai)
* **スタイリング**: Tailwind CSS (CDN)
* **地図データ**: d3-geo, topojson-client

## ローカルでの実行方法

**前提条件**: [Node.js](https://nodejs.org/) (v18以降推奨)

1.  **リポジトリをクローン**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git)
    cd YOUR_REPOSITORY_NAME
    ```

2.  **依存関係をインストール**
    ```bash
    npm install
    ```

3.  **APIキーの設定**
    * プロジェクトルートに `.env.local` ファイルを作成します。
    * [Google AI Studio](https://ai.studio.google.com/app/apikey) などで Gemini API キーを取得します。
    * `.env.local` に以下のようにキーを記述します:
    ```
    GEMINI_API_KEY='YOUR_GEMINI_API_KEY'
    ```

4.  **開発サーバーの起動**
    ```bash
    npm run dev
    ```

5.  ブラウザで `http://localhost:3000` を開きます。

## データソース

* 衛星の軌道要素 (TLE) データは [Celestrak](https://celestrak.org/) より取得しています。
