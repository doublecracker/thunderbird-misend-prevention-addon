# Contributing to Thunderbird 誤送信防止アドオン

このプロジェクトへの貢献に興味をお持ちいただき、ありがとうございます！このドキュメントでは、プロジェクトに貢献する方法について説明します。

## 目次

- [開発環境のセットアップ](#開発環境のセットアップ)
- [開発フロー](#開発フロー)
- [コーディング規約](#コーディング規約)
- [テスト方法](#テスト方法)
- [バグ報告](#バグ報告)
- [機能要求](#機能要求)
- [プルリクエスト](#プルリクエスト)

## 開発環境のセットアップ

### 必要なソフトウェア

- **Node.js** (v16.0.0以上)
- **npm** (v8.0.0以上)
- **Mozilla Thunderbird** (v78.0以上)
- **web-ext** (Mozilla公式開発ツール)

### セットアップ手順

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/yourusername/thunderbird-misend-prevention.git
   cd thunderbird-misend-prevention
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   ```

3. **web-extのインストール（グローバル）**
   ```bash
   npm install -g web-ext
   ```

4. **開発用Thunderbirdプロファイルの作成**
   ```bash
   thunderbird -P
   ```

## 開発フロー

### 1. ブランチ戦略

- **main**: 安定版のコード
- **develop**: 開発中のコード
- **feature/***: 新機能開発
- **bugfix/***: バグ修正
- **hotfix/***: 緊急修正

### 2. 開発手順

1. **フィーチャーブランチの作成**
   ```bash
   git checkout -b feature/new-feature-name
   ```

2. **開発とテスト**
   ```bash
   # 開発モードでThunderbirdを起動
   npm run dev
   
   # リンターチェック
   npm run lint
   
   # ビルドテスト
   npm run build
   ```

3. **コミット**
   ```bash
   git add .
   git commit -m "feat: 新機能の説明"
   ```

### 3. 開発コマンド

```bash
# 開発モードでThunderbirdを起動
npm run dev

# アドオンをビルド
npm run build

# リンターチェック
npm run lint

# アドオンをサイン（AMOアカウント必要）
npm run sign
```

## コーディング規約

### JavaScript

- **ES6+** の構文を使用
- **2スペース** インデント
- **セミコロン** を使用
- **キャメルケース** でネーミング
- **JSDoc** でコメントを記述

```javascript
/**
 * メールアドレスを解析する関数
 * @param {Array} recipients - 受信者リスト
 * @returns {Array} 解析されたメールアドレス配列
 */
function parseEmailAddresses(recipients) {
  // 実装...
}
```

### 命名規約

- **関数**: `camelCase` (例: `parseEmailAddresses`)
- **定数**: `UPPER_SNAKE_CASE` (例: `EMAIL_REGEX`)
- **変数**: `camelCase` (例: `isInitialized`)

### コメント

- **日本語** でコメントを記述
- **機能の説明** を必ず含める
- **複雑なロジック** には詳細な説明

```javascript
// 複数の送信検知方法で確実に動作させる
if (browser.compose && browser.compose.onBeforeSend) {
  // onBeforeSend APIを使用（推奨方法）
  console.log("✅ onBeforeSend API を使用します");
} else {
  // 代替手段を使用
  console.log("⚠️ 代替手段を使用します");
}
```

## テスト方法

### 手動テスト

1. **基本機能テスト**
   - TO欄に複数アドレス → 警告表示、送信停止
   - TO欄に1つアドレス → 送信許可
   - BCC欄のみ → 送信許可

2. **互換性テスト**
   - Thunderbird 78.0 〜 最新版
   - Windows 10/11
   - macOS（可能であれば）
   - Linux（可能であれば）

3. **エラーケーステスト**
   - 無効なメールアドレス
   - ネットワークエラー
   - 権限エラー

### テスト環境

```bash
# 開発用Thunderbirdプロファイルでテスト
web-ext run --target=thunderbird --thunderbird-profile=/path/to/test-profile

# 本番環境に近い条件でテスト
web-ext run --target=thunderbird
```

## バグ報告

バグを発見した場合は、以下の情報を含めてIssueを作成してください：

### バグ報告テンプレート

```markdown
## バグの概要
[バグの簡潔な説明]

## 再現手順
1. [手順1]
2. [手順2]
3. [手順3]

## 期待される動作
[期待される動作の説明]

## 実際の動作
[実際に起こった動作の説明]

## 環境情報
- OS: [Windows 11 Pro 22H2]
- Thunderbird: [142.0]
- アドオンバージョン: [1.1.2]

## 追加情報
[スクリーンショット、ログ、その他の情報]
```

## 機能要求

新機能の要求は、以下の情報を含めてIssueを作成してください：

### 機能要求テンプレート

```markdown
## 機能の概要
[要求する機能の簡潔な説明]

## 背景・動機
[なぜこの機能が必要か]

## 詳細な仕様
[機能の詳細な説明]

## 受け入れ基準
- [ ] [基準1]
- [ ] [基準2]
- [ ] [基準3]

## 追加情報
[参考資料、関連するIssue等]
```

## プルリクエスト

### PRガイドライン

1. **ブランチ戦略** に従ってブランチを作成
2. **コーディング規約** に従ってコードを記述
3. **テスト** を実行して動作確認
4. **詳細な説明** を含むPRを作成

### PRテンプレート

```markdown
## 変更内容
[変更内容の簡潔な説明]

## 関連Issue
Closes #[Issue番号]

## 変更の種類
- [ ] バグ修正
- [ ] 新機能
- [ ] 互換性を保つ変更
- [ ] 互換性を破る変更
- [ ] ドキュメント更新

## テスト
- [ ] 既存のテストがパス
- [ ] 新しいテストを追加
- [ ] 手動テストを実行

## チェックリスト
- [ ] コーディング規約に従っている
- [ ] 自己レビューを実施
- [ ] 必要に応じてドキュメントを更新
```

## 連絡方法

質問や提案がある場合は、以下の方法でお気軽にお問い合わせください：

- **GitHub Issues**: バグ報告・機能要求
- **GitHub Discussions**: 一般的な質問・議論
- **Email**: [your-email@example.com]

## ライセンス

このプロジェクトに貢献することで、あなたの貢献がMITライセンスの下でライセンスされることに同意したものとみなします。

---

**ご協力ありがとうございます！** 🎉

**最終更新**: 2025年8月23日
