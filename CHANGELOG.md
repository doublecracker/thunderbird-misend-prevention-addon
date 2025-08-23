# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.4] - 2025-08-23

### Fixed
- CC欄警告ダイアログの表示問題を修正
- 重複警告防止機能の改善（新しい警告でも表示されるように修正）

### Added
- 詳細ログ機能の追加（警告処理の追跡が可能）
- TO欄・CC欄警告処理の詳細ログ

### Changed
- 警告処理のログ出力を強化
- デバッグ情報の充実

---

## [1.1.3] - 2025-08-23

### Added
- CC欄の複数アドレス検出機能を追加
- TO欄・CC欄両方での誤送信防止機能

### Changed
- 警告メッセージをTO欄・CC欄両方に対応
- `showWarningDialog`関数に`fieldType`パラメータを追加

### Fixed
- CC欄での一斉送信によるプライバシー漏洩を防止

---

## [1.1.2] - 2025-08-23

### Added
- 日本語名を含むメールアドレス形式への対応
- 詳細なメールアドレス解析ログ出力機能
- 複数のメールアドレス形式への包括的対応

### Changed
- メールアドレス解析アルゴリズムの大幅改善
- `parseEmailAddresses` 関数の完全リライト
- エラーハンドリングの強化

### Fixed
- Thunderbird 128.9.1での動作不具合を修正
- "名前 <メールアドレス>" 形式の解析エラーを修正
- 日本語文字を含むメールアドレスの解析失敗を修正

---

## [1.1.1] - 2025-08-23

### Added
- Thunderbird 142.0での動作保証
- バージョン範囲の明示（78.0-150.*）

### Changed
- 最新バージョンでの互換性向上

---

## [1.1.0] - 2025-08-23

### Added
- 複数の送信検知方法による確実な動作（onBeforeSend API + content script）
- 強制的な送信停止機能
- 即座の警告表示機能
- 初期化保証機能
- Content scriptによる送信ボタン監視機能

### Changed
- 送信検知アーキテクチャの大幅改善
- エラーハンドリングの強化（エラー時も送信停止）
- 通知システムの多重化

### Fixed
- 他のPC環境での動作不具合を修正
- 初期化タイミングの問題を修正

---

## [1.0.9] - 2025-08-23

### Added
- JavaScript無効環境での動作改善
- 複数回の通知表示機能

### Changed
- システム通知の強化
- コンソール警告の改善

---

## [1.0.8] - 2025-08-23

### Fixed
- `browser.windows.create` の `focused` プロパティエラーを修正
- カスタムHTMLポップアップを通知とアラートに変更

---

## [1.0.7] - 2025-08-23

### Changed
- 作成者情報を `AKIO OGAWA` に更新
- 作成日を `2025年8月23日` に更新

---

## [1.0.6] - 2025-08-23

### Added
- `activeTab` 権限を追加

---

## [1.0.5] - 2025-08-23

### Removed
- `web_accessible_resources` セクションを削除

---

## [1.0.4] - 2025-08-23

### Added
- `web_accessible_resources` for `popup.html` and `popup.js`

---

## [1.0.3] - 2025-08-23

### Added
- `notifications` 権限を追加

### Changed
- `background.persistent` を `true` に変更

### Removed
- `compose_scripts` セクションを削除

---

## [1.0.2] - 2025-08-23

### Added
- `compose_scripts` セクションを追加

---

## [1.0.1] - 2025-08-23

### Changed
- `background.persistent` を `false` に変更
- 権限を `compose` のみに変更

### Removed
- `homepage_url` を削除
- `content_scripts` を削除

---

## [1.0.0] - 2025-01-27

### Added
- 基本的な誤送信防止機能
- TO欄の複数アドレス検出機能
- 警告ダイアログの表示機能
- `browser.compose.onBeforeSend` APIを使用した送信前検知
- システム通知による警告機能

### Features
- TO欄に複数のメールアドレスが入力された場合の自動検出
- 送信停止機能
- BCC欄での送信許可
- TO欄1件 + BCC欄複数件での送信許可

---

**最終更新**: 2025年8月23日
