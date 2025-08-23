// Thunderbird 誤送信防止アドオン - バックグラウンドスクリプト
// 作成者: AKIO OGAWA
// 作成日: 2025年8月23日
// 最終更新: 2025年8月23日 (v1.1.4 - CC欄警告修正版)

console.log("=== Thunderbird 誤送信防止アドオンが起動しました ===");

// メールアドレスの正規表現（改善版）
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// TO欄のメールアドレスを解析する関数（改善版）
function parseEmailAddresses(recipients) {
  console.log("📧 parseEmailAddresses 呼び出し:", recipients);
  
  if (!recipients || recipients.length === 0) {
    console.log("recipients が空です");
    return [];
  }
  
  const addresses = [];
  
  recipients.forEach(recipient => {
    console.log("📧 個別recipient処理:", recipient);
    
    let emailAddress = null;
    
    // 1. オブジェクト形式の場合
    if (typeof recipient === 'object' && recipient.address) {
      emailAddress = recipient.address;
      console.log("📧 オブジェクト形式から抽出:", emailAddress);
    }
    // 2. 文字列形式の場合
    else if (typeof recipient === 'string') {
      // 2-1. 直接メールアドレスの場合
      if (EMAIL_REGEX.test(recipient)) {
        emailAddress = recipient;
        console.log("📧 直接メールアドレス:", emailAddress);
      }
      // 2-2. "名前 <メールアドレス>" 形式の場合
      else {
        const match = recipient.match(/<([^>]+)>/);
        if (match && EMAIL_REGEX.test(match[1])) {
          emailAddress = match[1];
          console.log("📧 名前付き形式から抽出:", emailAddress);
        }
        // 2-3. その他の形式を試行
        else {
          // スペースで区切って最後の部分をメールアドレスとして試行
          const parts = recipient.trim().split(/\s+/);
          const lastPart = parts[parts.length - 1];
          if (EMAIL_REGEX.test(lastPart)) {
            emailAddress = lastPart;
            console.log("📧 分割抽出:", emailAddress);
          }
        }
      }
    }
    
    // 有効なメールアドレスを配列に追加
    if (emailAddress && EMAIL_REGEX.test(emailAddress)) {
      addresses.push(emailAddress);
      console.log("📧 有効なアドレスとして追加:", emailAddress);
    } else {
      console.log("📧 無効なアドレス:", recipient);
    }
  });
  
  console.log("📧 最終的に解析されたアドレス:", addresses);
  return addresses;
}

// 誤送信チェック関数（強化版）
async function checkForMisend(tabId) {
  console.log("🔍 checkForMisend 呼び出し - tabId:", tabId);
  
  try {
    // 作成中のメールの詳細を取得
    const composeDetails = await browser.compose.getComposeDetails(tabId);
    console.log("📋 取得したメール詳細:", composeDetails);
    
    const toAddresses = parseEmailAddresses(composeDetails.to);
    const ccAddresses = parseEmailAddresses(composeDetails.cc);
    const bccAddresses = parseEmailAddresses(composeDetails.bcc);
    
    console.log("📧 TOアドレス一覧:", toAddresses);
    console.log("📧 CCアドレス一覧:", ccAddresses);
    console.log("📧 BCCアドレス一覧:", bccAddresses);
  
    // TO欄またはCC欄に複数のメールアドレスがある場合に警告
    if (toAddresses.length > 1) {
      console.log("⚠️ 複数のTOアドレスが検出されました!");
      console.log("検出されたアドレス:", toAddresses);
      console.log("🚨 TO欄警告処理を開始します");
      
      // 警告ダイアログを表示
      const warningResult = await showWarningDialog(tabId, toAddresses, "TO");
      console.log("🚨 TO欄警告処理結果:", warningResult);
      
      return true; // 送信を停止
    } else if (ccAddresses.length > 1) {
      console.log("⚠️ 複数のCCアドレスが検出されました!");
      console.log("検出されたアドレス:", ccAddresses);
      console.log("🚨 CC欄警告処理を開始します");
      
      // 警告ダイアログを表示
      const warningResult = await showWarningDialog(tabId, ccAddresses, "CC");
      console.log("🚨 CC欄警告処理結果:", warningResult);
      
      return true; // 送信を停止
    } else if (toAddresses.length === 1) {
      console.log("✅ TOアドレスは1つです。送信を続行します。");
    } else if (toAddresses.length === 0 && bccAddresses.length > 0) {
      console.log("✅ BCCアドレスのみでの送信です。送信を続行します。");
    } else {
      console.log("✅ 送信を続行します。");
    }
      
    return false; // 送信を続行
  } catch (error) {
    console.error("❌ メール詳細の取得中にエラーが発生しました:", error);
    // エラーの場合も安全のため送信を停止
    console.error("🚨 エラーのため送信を停止します");
    return true;
  }
}

// 警告ダイアログを表示する関数（超強化版）
async function showWarningDialog(tabId, addresses, fieldType = "TO") {
  console.log("🚨 警告ダイアログを表示します");
  console.log("🚨 警告対象:", fieldType, "アドレス数:", addresses.length);
  
  // 重複警告を防ぐ（ただし、異なるフィールドタイプの場合は許可）
  if (warningShown) {
    console.log("⚠️ 既に警告が表示されています。新しい警告を表示します。");
    // 重複警告でも新しい警告は表示する
  }
  
  warningShown = true;
  
  try {
    // 方法1: 即座にシステム通知（最重要）
    try {
      await browser.notifications.create('misend-warning-immediate-' + Date.now(), {
        type: 'basic',
        iconUrl: '',
        title: '🚨 誤送信防止警告',
        message: `${fieldType}欄に${addresses.length}個のメールアドレスが検出されました！送信が停止されました。`
      });
      console.log("✅ 即座のシステム通知を表示しました");
    } catch (notifyError) {
      console.log("即座通知エラー:", notifyError.message);
    }
    
    // 方法2: コンソールに目立つ警告を表示（常に動作）
    console.error("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
    console.error("🚨 誤送信防止警告 🚨");
    console.error("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
    console.error(`${fieldType}欄に${addresses.length}個のメールアドレスが検出されました！`);
    console.error("検出されたアドレス:", addresses);
    console.error("送信が停止されました。BCC欄を使用してください。");
    console.error("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
    
    // 方法3: タブタイトル変更とアラート（JavaScript依存）
    try {
      const tab = await browser.tabs.get(tabId);
      if (tab) {
        // タブのタイトルを変更
        try {
          await browser.tabs.executeScript(tabId, {
            code: `
              document.title = "⚠️ 誤送信防止警告 - ${fieldType}欄の複数アドレスを確認してください";
              console.error("🚨 誤送信防止警告: ${fieldType}欄に複数のメールアドレスが検出されました！");
            `
          });
          console.log("✅ タブタイトルを変更しました");
        } catch (titleError) {
          console.log("タブタイトル変更エラー:", titleError.message);
        }
        
        // アラートダイアログを表示
        try {
          await browser.tabs.executeScript(tabId, {
            code: `
              if (window.alert) {
                alert("⚠️ 誤送信防止警告\\n\\n${fieldType}欄に複数のメールアドレスが検出されました。\\n\\n検出されたアドレス:\\n• ${addresses.join('\\n• ')}\\n\\nBCC欄を使用することを推奨します。\\n\\n送信が停止されました。");
              }
            `
          });
          console.log("✅ アラートダイアログを表示しました");
        } catch (alertError) {
          console.log("アラート表示エラー:", alertError.message);
        }
      }
    } catch (tabError) {
      console.log("タブ操作エラー:", tabError.message);
    }
    
    // 方法4: 複数の追加通知（時間差で確実に表示）
    const additionalNotifications = [
      { delay: 1000, title: '🚫 送信が停止されました', message: `BCC欄を使用して送信してください。` },
      { delay: 2000, title: '⚠️ 重要: 送信が停止されています', message: `${fieldType}欄の複数アドレスをBCC欄に移動してください。` },
      { delay: 3000, title: '🚨 緊急: 誤送信の危険性', message: `${fieldType}欄に${addresses.length}個のアドレスがあります。BCC欄に移動してください。` }
    ];
    
    additionalNotifications.forEach(({ delay, title, message }) => {
      setTimeout(async () => {
        try {
          await browser.notifications.create('misend-warning-' + Date.now(), {
            type: 'basic',
            iconUrl: '',
            title: title,
            message: message
          });
        } catch (notifyError) {
          console.log(`通知エラー (${delay}ms):`, notifyError.message);
        }
      }, delay);
    });
    
    return true; // 送信を停止
    
  } catch (error) {
    console.error("❌ 警告ダイアログ表示エラー:", error);
    // エラーが発生しても、最低限コンソールに警告を表示
    console.error(`🚨 誤送信防止警告: ${fieldType}欄に複数のメールアドレスが検出されました！`);
    console.error("🚨 送信が停止されました。BCC欄を使用してください。");
    return true; // エラーの場合も送信を停止
  }
}

// 初期化関数
async function initializeAddon() {
  console.log("🔍 アドオン初期化開始...");
  
  try {
    // 方法1: onBeforeSend API（推奨）
    if (browser.compose && browser.compose.onBeforeSend) {
      console.log("✅ onBeforeSend API を使用します");
      
      browser.compose.onBeforeSend.addListener(async (tab, details) => {
        console.log("🚀 送信前イベントが発生しました!");
        console.log("Tab ID:", tab.id);
        console.log("Details:", details);
        
        try {
          const shouldCancel = await checkForMisend(tab.id);
          
          if (shouldCancel) {
            console.log("❌ 送信をキャンセルしました");
            return { cancel: true };
          }
          
          console.log("✅ 送信を続行します");
          return { cancel: false };
        } catch (error) {
          console.error("❌ 送信前チェックでエラーが発生しました:", error);
          // エラーの場合は安全のため送信を停止
          return { cancel: true };
        }
      });
      
      console.log("✅ onBeforeSend リスナーが正常に登録されました");
      isInitialized = true;
      return;
    }
    
    // 方法2: 代替手段（onBeforeSendが利用できない場合）
    console.log("⚠️ onBeforeSend API が利用できません。代替手段を使用します");
    
    // メッセージリスナーで代替
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("💬 メッセージを受信:", request);
      
      if (request.action === 'checkMisend') {
        checkForMisend(request.tabId).then(shouldCancel => {
          sendResponse({ cancel: shouldCancel });
        });
        return true; // 非同期レスポンス
      }
    });
    
    isInitialized = true;
    console.log("✅ 代替手段で初期化完了");
    
  } catch (error) {
    console.error("❌ 初期化エラー:", error);
    // エラーが発生しても最低限の機能は提供
    isInitialized = true;
  }
}

// グローバル変数
let isInitialized = false;
let warningShown = false;

// アドオンがインストールされた時の処理
browser.runtime.onInstalled.addListener(async (details) => {
  console.log("🎉 Thunderbird 誤送信防止アドオンがインストールされました:", details);
  
  // 初期化を実行
  await initializeAddon();
  
  // 初期化時の情報を出力
  setTimeout(() => {
    console.log("=== 初期化情報 ===");
    console.log("Browser compose API:", !!browser.compose);
    console.log("Runtime ID:", browser.runtime.id);
    console.log("初期化完了:", isInitialized);
    console.log("===================");
  }, 1000);
});

// 起動時の初期化
initializeAddon();

console.log("=== バックグラウンドスクリプトの初期化完了 ==="); 