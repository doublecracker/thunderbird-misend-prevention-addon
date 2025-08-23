# Thunderbirdでメール誤送信を100%防ぐ無料アドオンを開発しました

**タグ**: #Thunderbird #プライバシー #メール #WebExtension #JavaScript

## はじめに

皆さんは、メールを送信した後に「あっ、TO欄に複数の人のメールアドレスを入れてしまった！」と冷や汗をかいた経験はありませんか？

特にビジネスや教育現場では、一斉メールを送る際にTO欄ではなくBCC欄を使うのがマナーです。しかし、人間のミスは避けられません。そこで、技術的に100%防げるソリューションを開発しました。

## 開発した「Thunderbird 誤送信防止アドオン」とは

このアドオンは、Mozilla Thunderbirdでメール送信時に以下の機能を提供します：

### 🔍 主要機能

1. **TO欄・CC欄の複数アドレス自動検出**
   - 送信前に自動的にチェック
   - 日本語名「小川明男 <email@example.com>」形式にも対応

2. **確実な送信停止**
   - 複数アドレスが検出されたら即座に送信を停止
   - エラーが発生しても確実に停止

3. **分かりやすい警告表示**
   - システム通知
   - アラートダイアログ
   - コンソール警告（開発者向け）

### ⚡ 動作例

```
🚨 誤送信防止警告

TO欄に複数のメールアドレスが検出されました！
送信が停止されました。

検出されたアドレス:
• yamada@example.com
• tanaka@example.com

BCC欄を使用することを推奨します。
```

## 技術的な実装のポイント

### WebExtension APIの活用

```javascript
// 送信前イベントの監視
browser.compose.onBeforeSend.addListener(async (tab, details) => {
  const composeDetails = await browser.compose.getComposeDetails(tab.id);
  const toAddresses = parseEmailAddresses(composeDetails.to);
  
  if (toAddresses.length > 1) {
    await showWarningDialog(tab.id, toAddresses, "TO");
    return { cancel: true }; // 送信を停止
  }
});
```

### メールアドレス解析の工夫

日本語名を含むメールアドレス形式への対応が一番苦労した点でした：

```javascript
function parseEmailAddresses(recipients) {
  const addresses = [];
  
  recipients.forEach(recipient => {
    let emailAddress = null;
    
    // オブジェクト形式の場合
    if (typeof recipient === 'object' && recipient.address) {
      emailAddress = recipient.address;
    }
    // "名前 <メールアドレス>" 形式の場合
    else if (typeof recipient === 'string') {
      const match = recipient.match(/<([^>]+)>/);
      if (match && EMAIL_REGEX.test(match[1])) {
        emailAddress = match[1];
      }
    }
    
    if (emailAddress && EMAIL_REGEX.test(emailAddress)) {
      addresses.push(emailAddress);
    }
  });
  
  return addresses;
}
```

### 確実性を重視した設計

- **複数の送信検知方法**: `onBeforeSend` API + content script
- **強制停止**: エラーが発生しても確実に送信を停止
- **複数の通知方法**: システム通知、アラート、コンソール警告

## なぜ作ったのか？

### 実体験から生まれた必要性

実際にビジネス環境で、メール誤送信による個人情報漏洩事故を目撃したことがきっかけです。特に：

- **プライバシー保護**: GDPR・個人情報保護法への対応
- **ビジネスマナー**: 複数宛先はBCC欄を使用するのが常識
- **人的ミスの排除**: 技術的に100%防げるなら防ぐべき

### 他のソリューションとの違い

既存のメールクライアントには基本的な送信確認機能はありますが：

- **専門性**: プライバシー保護に特化
- **確実性**: 100%の防止を目指した設計
- **無料**: オープンソースで誰でも使用可能

## 対応環境

- **Thunderbird**: v78.0 以降（v128.9.1、v142.0で動作確認済み）
- **OS**: Windows 10/11、macOS、Linux
- **多言語**: 日本語名を含むメールアドレスに対応

## インストール方法

### 1. ZIPファイルのダウンロード
```
thunderbird_-1.1.4.zip
```

### 2. Thunderbirdでのインストール
1. Thunderbirdを開く
2. `ツール` → `アドオン` を選択
3. 歯車アイコン → `ファイルからアドオンをインストール`
4. ダウンロードしたZIPファイルを選択

### 3. 動作確認
TO欄に複数のメールアドレスを入力して送信ボタンをクリック → 警告が表示されればOK！

## 今後の計画

### v1.2.0 予定機能
- **設定画面**: ユーザーカスタマイズ機能
- **統計機能**: 誤送信防止回数の記録
- **多言語対応**: 英語・中国語・韓国語

### v2.0.0 構想
- **AI機能**: メール内容の自動チェック
- **クラウド連携**: 設定の同期機能
- **他プラットフォーム**: Outlook、Apple Mail対応

## オープンソースとしての公開

このアドオンは **MITライセンス** で公開しています：

- **GitHub**: https://github.com/akioogawa/thunderbird-misend-prevention
- **Issue報告**: バグ報告・機能要求を歓迎
- **Pull Request**: コミュニティからの貢献を歓迎

## 技術者向け情報

### 開発環境のセットアップ

```bash
# リポジトリクローン
git clone https://github.com/akioogawa/thunderbird-misend-prevention.git
cd thunderbird-misend-prevention

# 依存関係インストール
npm install

# 開発モード起動
npm run dev

# ビルド
npm run build
```

### アーキテクチャ

- **Manifest V2**: Thunderbird対応
- **Background Script**: メイン処理 (`background.js`)
- **Content Script**: 送信ボタン監視 (`content.js`)
- **WebExtension APIs**: `compose`, `notifications`, `tabs`

## 社会的インパクト

### プライバシー保護の普及
- **教育効果**: ユーザーの意識向上
- **業界標準**: プライバシー保護のベストプラクティス
- **法規制対応**: GDPR・個人情報保護法への対応

### ビジネス環境での活用
- **リスク軽減**: 情報漏洩事故の防止
- **コンプライアンス**: 企業のガバナンス強化
- **教育ツール**: 適切なメール運用の啓蒙

## まとめ

メール誤送信は「うっかりミス」として軽視されがちですが、プライバシー保護の観点から見れば重大な問題です。技術的に100%防げるなら、積極的に防ぐべきです。

このアドオンが、より安全で適切なメール運用の普及に貢献できれば幸いです。

### ご利用・フィードバックお待ちしています！

- **ダウンロード**: [GitHub Releases](https://github.com/akioogawa/thunderbird-misend-prevention/releases)
- **バグ報告**: [GitHub Issues](https://github.com/akioogawa/thunderbird-misend-prevention/issues)
- **お問い合わせ**: firecracker2100@yahoo.co.jp

---

**AKIO OGAWA**  
ソフトウェア開発者 | プライバシー保護推進者

**関連記事**:
- [WebExtension開発で実現するセキュリティ機能](#)
- [プライバシー保護のためのメール運用ベストプラクティス](#)
- [Thunderbirdアドオン開発の実践ガイド](#)
