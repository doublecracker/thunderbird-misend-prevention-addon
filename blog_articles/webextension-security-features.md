# WebExtension開発で実現するセキュリティ機能 - Thunderbird誤送信防止アドオンの技術解説

**タグ**: #WebExtension #Thunderbird #JavaScript #セキュリティ #開発

## はじめに

WebExtension APIを使用して、Thunderbirdのメール送信プロセスに介入し、プライバシー保護機能を実装する方法を詳しく解説します。

実際に開発した「Thunderbird誤送信防止アドオン」を例に、セキュリティ機能の実装パターンとベストプラクティスを紹介します。

## プロジェクト概要

### 解決したい問題
- TO欄での一斉メール送信によるプライバシー漏洩
- 人的ミスによる誤送信事故
- 企業・教育機関でのコンプライアンス対応

### 技術要件
- 100%の確実性で誤送信を防ぐ
- 様々なメールアドレス形式に対応
- ユーザーフレンドリーな警告表示
- Thunderbird 78.0以降で動作

## 技術アーキテクチャ

### 1. Manifest V2の設計

```json
{
  "manifest_version": 2,
  "name": "Thunderbird 誤送信防止アドオン",
  "version": "1.1.4",
  
  "applications": {
    "gecko": {
      "id": "misend-prevention@example.com",
      "strict_min_version": "78.0",
      "strict_max_version": "150.*"
    }
  },
  
  "permissions": [
    "compose",      // メール作成機能
    "notifications", // システム通知
    "tabs",         // タブ操作
    "activeTab"     // アクティブタブアクセス
  ],
  
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  },
  
  "content_scripts": [{
    "matches": ["*://*/*"],
    "js": ["content.js"],
    "run_at": "document_end"
  }]
}
```

### 2. 核心となるWebExtension APIs

#### compose API
```javascript
// 送信前イベントの監視
browser.compose.onBeforeSend.addListener(async (tab, details) => {
  try {
    const result = await checkForMisend(tab.id);
    if (result) {
      return { cancel: true }; // 送信を停止
    }
  } catch (error) {
    console.error("送信チェックエラー:", error);
    return { cancel: true }; // エラー時も安全のため停止
  }
});

// メール詳細の取得
const composeDetails = await browser.compose.getComposeDetails(tabId);
```

#### notifications API
```javascript
// システム通知の表示
await browser.notifications.create('misend-warning-' + Date.now(), {
  type: 'basic',
  iconUrl: '',
  title: '🚨 誤送信防止警告',
  message: `${fieldType}欄に${addresses.length}個のメールアドレスが検出されました！`
});
```

#### tabs API
```javascript
// タブでのスクリプト実行（アラート表示）
await browser.tabs.executeScript(tabId, {
  code: `
    if (window.alert) {
      alert("⚠️ 誤送信防止警告\\n\\n送信が停止されました。");
    }
  `
});
```

## 核心機能の実装詳細

### 1. メールアドレス解析エンジン

最も技術的に挑戦的だった部分です。Thunderbirdでは様々な形式でメールアドレスが格納されます：

```javascript
function parseEmailAddresses(recipients) {
  console.log("📧 parseEmailAddresses 呼び出し:", recipients);
  
  if (!recipients || recipients.length === 0) {
    return [];
  }
  
  const addresses = [];
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  recipients.forEach(recipient => {
    let emailAddress = null;
    
    // 1. オブジェクト形式: {address: "email@example.com"}
    if (typeof recipient === 'object' && recipient.address) {
      emailAddress = recipient.address;
    }
    // 2. 文字列形式の処理
    else if (typeof recipient === 'string') {
      // 2-1. 直接メールアドレス: "email@example.com"
      if (EMAIL_REGEX.test(recipient)) {
        emailAddress = recipient;
      }
      // 2-2. 名前付き形式: "小川明男 <email@example.com>"
      else {
        const match = recipient.match(/<([^>]+)>/);
        if (match && EMAIL_REGEX.test(match[1])) {
          emailAddress = match[1];
        }
        // 2-3. その他の形式（スペース区切りなど）
        else {
          const parts = recipient.trim().split(/\s+/);
          const lastPart = parts[parts.length - 1];
          if (EMAIL_REGEX.test(lastPart)) {
            emailAddress = lastPart;
          }
        }
      }
    }
    
    // 有効なメールアドレスのみ追加
    if (emailAddress && EMAIL_REGEX.test(emailAddress)) {
      addresses.push(emailAddress);
    }
  });
  
  return addresses;
}
```

### 2. 多層防御による確実な送信停止

単一の方法に依存せず、複数の手法で確実性を高めています：

```javascript
async function checkForMisend(tabId) {
  try {
    const composeDetails = await browser.compose.getComposeDetails(tabId);
    
    const toAddresses = parseEmailAddresses(composeDetails.to);
    const ccAddresses = parseEmailAddresses(composeDetails.cc);
    
    // TO欄またはCC欄に複数アドレスがある場合
    if (toAddresses.length > 1) {
      await showWarningDialog(tabId, toAddresses, "TO");
      return true; // 送信を停止
    } else if (ccAddresses.length > 1) {
      await showWarningDialog(tabId, ccAddresses, "CC");
      return true; // 送信を停止
    }
    
    return false; // 送信を続行
  } catch (error) {
    console.error("メール詳細取得エラー:", error);
    // エラーの場合も安全のため送信を停止
    return true;
  }
}
```

### 3. ユーザーフレンドリーな警告システム

複数の通知方法を組み合わせて、確実にユーザーに伝達：

```javascript
async function showWarningDialog(tabId, addresses, fieldType = "TO") {
  // 方法1: システム通知（最優先）
  try {
    await browser.notifications.create('warning-' + Date.now(), {
      type: 'basic',
      iconUrl: '',
      title: '🚨 誤送信防止警告',
      message: `${fieldType}欄に${addresses.length}個のメールアドレスが検出されました！`
    });
  } catch (error) {
    console.log("通知エラー:", error);
  }
  
  // 方法2: コンソール警告（開発者・デバッグ用）
  console.error("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
  console.error("🚨 誤送信防止警告 🚨");
  console.error(`${fieldType}欄に${addresses.length}個のメールアドレスが検出されました！`);
  console.error("検出されたアドレス:", addresses);
  console.error("送信が停止されました。BCC欄を使用してください。");
  
  // 方法3: タブタイトル変更
  try {
    await browser.tabs.executeScript(tabId, {
      code: `document.title = "⚠️ 誤送信防止警告 - ${fieldType}欄の複数アドレスを確認してください";`
    });
  } catch (error) {
    console.log("タイトル変更エラー:", error);
  }
  
  // 方法4: アラートダイアログ
  try {
    await browser.tabs.executeScript(tabId, {
      code: `
        if (window.alert) {
          alert("⚠️ 誤送信防止警告\\n\\n${fieldType}欄に複数のメールアドレスが検出されました。\\n\\n検出されたアドレス:\\n• ${addresses.join('\\n• ')}\\n\\nBCC欄を使用することを推奨します。");
        }
      `
    });
  } catch (error) {
    console.log("アラート表示エラー:", error);
  }
}
```

## セキュリティ考慮事項

### 1. 最小権限の原則

必要最小限の権限のみを要求：

```json
"permissions": [
  "compose",      // メール作成機能（必須）
  "notifications", // システム通知（警告表示用）
  "tabs",         // タブ操作（アラート表示用）
  "activeTab"     // アクティブタブアクセス（制限的）
]
```

### 2. データプライバシー

- **外部送信なし**: すべての処理はローカルで完結
- **データ保存なし**: メールアドレスや内容を保存しない
- **最小アクセス**: 必要な情報のみアクセス

### 3. エラーハンドリング

```javascript
try {
  // メイン処理
  const result = await processEmail();
  return result;
} catch (error) {
  console.error("処理エラー:", error);
  // エラー時はセキュリティのために送信を停止
  return { cancel: true };
}
```

## テストとデバッグ

### 1. 開発環境のセットアップ

```bash
# web-ext ツールのインストール
npm install -g web-ext

# 開発モードでThunderbirdを起動
web-ext run --target=thunderbird

# リアルタイムでのコードリロード
web-ext run --target=thunderbird --reload
```

### 2. デバッグ手法

```javascript
// 詳細なログ出力
console.log("🔍 送信前チェック開始");
console.log("📧 TO欄:", toAddresses);
console.log("📧 CC欄:", ccAddresses);
console.log("📧 BCC欄:", bccAddresses);

// 条件分岐の可視化
if (toAddresses.length > 1) {
  console.log("⚠️ TO欄に複数アドレスを検出");
} else if (ccAddresses.length > 1) {
  console.log("⚠️ CC欄に複数アドレスを検出");
} else {
  console.log("✅ 送信続行");
}
```

### 3. テストケース

```javascript
// テスト用のメールアドレス形式
const testCases = [
  // 基本形式
  ["test1@example.com", "test2@example.com"],
  
  // 日本語名付き
  ["小川明男 <ogawa@example.com>", "田中太郎 <tanaka@example.com>"],
  
  // 混合形式
  ["test@example.com", "山田花子 <yamada@example.com>"],
  
  // エッジケース
  ["user+tag@example.com", "very.long.email.address@subdomain.example.com"]
];
```

## パフォーマンス最適化

### 1. 非同期処理の活用

```javascript
// 並列処理でパフォーマンス向上
const [toAddresses, ccAddresses, bccAddresses] = await Promise.all([
  parseEmailAddresses(composeDetails.to),
  parseEmailAddresses(composeDetails.cc),
  parseEmailAddresses(composeDetails.bcc)
]);
```

### 2. メモリ効率

```javascript
// 不要な変数の早期解放
function processEmailAddresses(recipients) {
  const addresses = parseEmailAddresses(recipients);
  recipients = null; // 早期解放
  return addresses;
}
```

## 互換性とメンテナンス

### 1. バージョン対応

```json
"applications": {
  "gecko": {
    "strict_min_version": "78.0",   // 最小サポートバージョン
    "strict_max_version": "150.*"   // 将来バージョンへの対応
  }
}
```

### 2. フォールバック機能

```javascript
// API利用可能性のチェック
if (browser.compose && browser.compose.onBeforeSend) {
  // メインの実装
  console.log("✅ onBeforeSend API を使用");
} else {
  // フォールバック実装
  console.log("⚠️ 代替手段を使用");
}
```

## 今後の技術的発展

### 1. AI機能の統合

```javascript
// 将来の拡張予定
async function analyzeEmailContent(content) {
  // メール内容の自動分析
  // 機密情報の検出
  // 送信先の妥当性チェック
}
```

### 2. クラウド連携

```javascript
// 設定の同期機能
async function syncSettings() {
  // 複数デバイス間での設定共有
  // 組織レベルでのポリシー適用
}
```

## まとめ

WebExtension APIを活用することで、既存のメールクライアントに高度なセキュリティ機能を追加できることを実証しました。

### 技術的な学び

1. **多層防御の重要性**: 単一の方法に依存しない設計
2. **ユーザビリティとセキュリティの両立**: 使いやすく、かつ確実な機能
3. **エッジケースの処理**: 様々な入力形式への対応
4. **デバッグの重要性**: 詳細なログ出力による問題特定

### 開発者への提案

- **セキュリティファースト**: プライバシー保護を最優先
- **ユーザーテスト**: 実際の使用環境でのテスト
- **オープンソース**: コミュニティからのフィードバック活用
- **継続的改善**: ユーザーニーズに応じた機能拡張

この技術解説が、WebExtension開発やセキュリティ機能実装の参考になれば幸いです。

---

**参考リンク**:
- [GitHub Repository](https://github.com/akioogawa/thunderbird-misend-prevention)
- [Mozilla WebExtension API Documentation](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions)
- [Thunderbird Add-on Development Guide](https://developer.thunderbird.net/add-ons)
