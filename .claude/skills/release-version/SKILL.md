---
name: release-version
description: >
  UnityToolManager プロジェクトのバージョン更新・リリースを行うスキル。
  バージョンの更新、CHANGELOG の生成、gh コマンドによる GitHub Release の作成、
  README などドキュメントの更新を一括で実行する。
  ユーザーが「リリース」「バージョン更新」「version bump」「release」
  「新バージョン」「v0.x.x を出したい」などと言った場合にこのスキルを使うこと。
---

# Release Version Skill

UnityToolManager のバージョン更新とリリースを行う。

## プロジェクト構成

このプロジェクトは3つのコンポーネントからなるモノレポ:

| コンポーネント | バージョン管理ファイル | 説明 |
|---|---|---|
| Unity Package | `UnityToolManager_Unity/Packages/jp.atsuatsu.toolmanager/package.json` | `version` フィールド |
| GAS Backend | `UnityToolManager_Gas/package.json` | `version` フィールド |
| Generator | `UnityToolManager_Generator/` | バージョンファイルなし（Unity Package に同梱） |

リポジトリ: `AtsuAtsu0120/UnityToolManager`

## リリースフロー

ユーザーにバージョン番号（SemVer: `x.y.z`）と変更内容を確認してから、以下を順に実行する。

### Step 0: 事前チェック

リリース作業を始める前に以下を確認する:

1. `gh auth status` で GitHub CLI の認証状態を確認。未認証ならユーザーに `gh auth login` を促す
2. `git status` で未コミットの変更を確認。リリース対象外の変更がある場合はユーザーに先にコミットまたはスタッシュするよう促す
3. `git tag -l "v*"` で既存タグを確認し、バージョン番号の重複を防ぐ

### Step 1: バージョン番号の決定

ユーザーに以下を確認する:
- 新しいバージョン番号（例: `0.1.0`）
- 主な変更内容の概要

バージョン番号が未指定の場合、git log から前回のタグ以降の変更を見て、SemVer に基づく提案を行う:
- 破壊的変更 → メジャーバージョンアップ
- 新機能追加 → マイナーバージョンアップ
- バグ修正のみ → パッチバージョンアップ

全コンポーネント（Unity Package・GAS）は同一バージョンで管理する。

### Step 2: package.json の更新

全コンポーネントの `version` フィールドを新しいバージョンに統一更新する。
更新対象ファイル:

- `UnityToolManager_Unity/Packages/jp.atsuatsu.toolmanager/package.json`
- `UnityToolManager_Gas/package.json`

### Step 3: CHANGELOG.md の更新

プロジェクトルートの `CHANGELOG.md` を更新する（存在しない場合は新規作成）。
[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) フォーマットに従う。

```markdown
# Changelog

## [x.y.z] - YYYY-MM-DD

### Added
- 新機能の説明

### Changed
- 変更の説明

### Fixed
- 修正の説明
```

git log からコミットメッセージを読み取り、変更内容を分類して記述する。
ユーザーが提供した変更概要も反映する。

### Step 4: README.md の更新（必要な場合）

以下のケースで README.md を更新する:
- 新機能の追加によりセットアップ手順や使い方が変わった場合
- 前提条件が変わった場合
- バージョン番号がREADME内で参照されている場合

変更がない場合はスキップする。ユーザーに更新内容を確認してから反映する。

### Step 5: コミットとタグ

変更をコミットし、バージョンタグを付ける。
`git add` はリリースで変更したファイルのみを明示的に指定する（`git add -A` は使わない）:

```bash
git add UnityToolManager_Unity/Packages/jp.atsuatsu.toolmanager/package.json \
        UnityToolManager_Gas/package.json \
        CHANGELOG.md \
        README.md  # 更新した場合のみ
git commit -m "release: v{VERSION}"
git tag v{VERSION}
```

コミット前に `git diff --staged` でステージング内容をユーザーに見せて確認を取る。
確認が取れたらプッシュする:

```bash
git push origin main
git push origin v{VERSION}
```

### Step 6: GitHub Release の作成

`gh` コマンドでリリースを作成する:

```bash
gh release create v{VERSION} \
  --title "v{VERSION}" \
  --notes "$(cat <<'EOF'
## What's Changed

{CHANGELOG の当該バージョンの内容をここに展開}
EOF
)"
```

リリースノートには CHANGELOG.md の当該バージョンのセクションをそのまま使用する。

### Step 7: 完了報告

以下をユーザーに報告する:
- 更新したファイル一覧
- 作成したタグ
- GitHub Release の URL（`gh release view` で取得）

## 注意事項

- 各ステップでユーザーに確認を取ってから次に進むこと（特に push と release 作成）
- `gh auth status` で GitHub CLI の認証状態を事前に確認すること
- 未コミットの変更がある場合は、先にそれを処理するようユーザーに促すこと
- リリース前にテストが通ることを確認するか、ユーザーにテスト済みか確認すること
