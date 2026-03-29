# Unity Tool Manager

Unity Editor の MenuItem 使用統計を Google Sheets に自動収集するツールです。
`[StatisticsMenuItem]` 属性を付けるだけで、メニュー項目の実行を自動的にトラッキングできます。

## 構成

| ディレクトリ | 説明 |
|---|---|
| `UnityToolManager_Unity/` | Unity プロジェクト本体。カスタムパッケージ `jp.atsuatsu.toolmanager` を含む |
| `UnityToolManager_Generator/` | C# Source Generator。`[StatisticsMenuItem]` 属性から MenuItem ラッパーを自動生成 |
| `UnityToolManager_Gas/` | Google Apps Script バックエンド。統計データを Google Sheets に記録 |

## 前提条件

- Unity 2019.1 以上
- Node.js（GAS のビルドに使用）
- Google アカウント
- [clasp](https://github.com/google/clasp)（Google Apps Script CLI）

```bash
npm install -g @google/clasp
clasp login
```

## セットアップ

### 1. GAS（Google Apps Script）のセットアップ

#### 1-1. GAS プロジェクトの準備

Google Apps Script で新しいプロジェクトを作成し、スクリプト ID を取得します。

1. [Google Apps Script](https://script.google.com/) にアクセスし、新しいプロジェクトを作成
2. プロジェクトの設定 > スクリプト ID をコピー
3. `UnityToolManager_Gas/.clasp.json` の `scriptId` を自分のスクリプト ID に書き換える

#### 1-2. ビルド & デプロイ

```bash
cd UnityToolManager_Gas
npm install
npm run push
```

#### 1-3. GAS エディタでの設定

GAS エディタ（https://script.google.com/）で以下を行います:

1. **API キーの設定**: プロジェクトの設定 > スクリプトプロパティ に `API_KEY` を追加し、任意の文字列を設定
2. **初期化の実行**: エディタで `initializeSheet` 関数を選択して実行（ヘッダー行と統計シートが作成されます）
3. **自動更新トリガーの設定**: `installStatisticsTrigger` 関数を実行（1時間ごとに統計シートが自動更新されます）

#### 1-4. Web アプリとしてデプロイ

1. デプロイ > 新しいデプロイ
2. 種類: **ウェブアプリ**
3. 次のユーザーとして実行: **自分**
4. アクセスできるユーザー: **全員**
5. デプロイ後に表示される **URL を控えておく**（Unity 側の設定で使用します）

### 2. Unity パッケージのインストール

以下のいずれかの方法でパッケージをインストールします。

**方法 A: Package Manager から追加**

1. Unity で Window > Package Manager を開く
2. 左上の **+** > **Add package from disk...** を選択
3. `UnityToolManager_Unity/Packages/jp.atsuatsu.toolmanager/package.json` を選択

**方法 B: manifest.json に直接追加**

対象プロジェクトの `Packages/manifest.json` の `dependencies` に以下を追加します:

```json
"jp.atsuatsu.toolmanager": "file:path/to/UnityToolManager_Unity/Packages/jp.atsuatsu.toolmanager"
```

※ パスは対象プロジェクトの `Packages/` ディレクトリからの相対パスで指定してください。

### 3. Unity の設定

1. Edit > Project Settings > Tool Manager > StatisticsMenuItem を開く
2. **GAS URL**: 手順 1-4 で取得したデプロイ URL を入力
3. **API Key**: 手順 1-3 で設定した API キーと同じ値を入力

## 使い方

統計を取りたいメニュー項目に属性を付ける

```csharp
using Generators;

public static partial class MyTools
{
    [StatisticsMenuItem("Tools/MyTool/DoSomething")]
    static void DoSomething()
    {
        Debug.Log("実行されました");
    }
}
```

`[StatisticsMenuItem("メニューパス")]` を付けた `static` メソッドに対して、Source Generator が `[MenuItem]` 付きのラッパーメソッドを自動生成します。ラッパーは元のメソッドを呼び出す前に、使用統計を GAS に送信します。

**注意**: クラスには `partial` 修飾子が必要です。

## 動作の流れ

1. ユーザーが Unity Editor のメニュー項目を実行
2. Source Generator が生成したラッパーが `StatisticsMenuItemHelper.SendStatistics()` を呼び出し
3. メソッド名・実行日時・ユーザー名を JSON で GAS に POST
4. GAS が受信データを Google Sheets に記録
5. 元のメソッドが実行される

