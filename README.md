# 数式グラフジェネレーター

数式を入力して2Dグラフを生成し、3D空間で回転させることができるウェブアプリケーションです。

## 機能

- 数式入力による2Dグラフの生成
- X軸の範囲指定
- 3D空間でのグラフ回転（X軸、Y軸、Z軸）

## 使用方法

1. 数式を入力欄に入力します（例：x^2 + 2*x + 1）
2. X軸の範囲を設定します
3. 「グラフ生成」ボタンをクリックしてグラフを表示
4. 回転軸を選択して「3D回転」ボタンをクリックすると回転アニメーションが開始

## 使用している技術

- MathJax：数式の表示
- Plot.ly：2Dグラフの描画
- Three.js：3D表示と回転
