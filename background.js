// Thunderbird 誤送信防止アドオン - バックグラウンドスクリプト
// 作成者: AKIO OGAWA
// 作成日: 2025年8月23日
// 最終更新: 2025年8月23日 (v1.2.0 - プライバシー保護強化版 + CC設定機能)

console.log("=== Thunderbird 誤送信防止アドオンが起動しました ===");

// メールアドレスの正規表現（改善版）
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// プライバシー保護強化機能の設定
const PRIVACY_ENHANCEMENT_ENABLED = true; // 実験的機能の有効/無効

// デフォルト設定
const DEFAULT_SETTINGS = {
  privacyEnhancement: true,
  ccMultipleAllowed: false, // CC欄の複数アドレス送信を許可するかどうか
  showNotifications: true,
  enableLogging: true,
  privacyEnhancementConfirm: true
};

// 現在の設定
let currentSettings = { ...DEFAULT_SETTINGS };

// 設定を読み込む関数
async function loadSettings() {
  try {
    const stored = await browser.storage.local.get('addonSettings');
    if (stored.addonSettings) {
      currentSettings = { ...DEFAULT_SETTINGS, ...stored.addonSettings };
      console.log("✅ 設定を読み込みました:", currentSettings);
    } else {
      // 初回起動時はデフォルト設定を保存
      await saveSettings(currentSettings);
      console.log("✅ デフォルト設定を保存しました:", currentSettings);
    }
  } catch (error) {
    console.error("❌ 設定の読み込みに失敗しました:", error);
    currentSettings = { ...DEFAULT_SETTINGS };
  }
}

// 設定を保存する関数
async function saveSettings(settings) {
  try {
    await browser.storage.local.set({ addonSettings: settings });
    currentSettings = { ...settings };
    console.log("✅ 設定を保存しました:", currentSettings);
    return true;
  } catch (error) {
    console.error("❌ 設定の保存に失敗しました:", error);
    return false;
  }
}

// 設定を更新する関数
async function updateSetting(key, value) {
  const newSettings = { ...currentSettings, [key]: value };
  const success = await saveSettings(newSettings);
  if (success) {
    console.log(`✅ 設定を更新しました: ${key} = ${value}`);
  }
  return success;
}

// 設定を取得する関数
function getSetting(key) {
  return currentSettings[key] !== undefined ? currentSettings[key] : DEFAULT_SETTINGS[key];
}

// ストレージ変更の監視（設定画面からの変更を即座に反映）
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.addonSettings) {
    console.log('📢 ストレージの変更を検出（バックグラウンド）:', changes.addonSettings.newValue);
    if (changes.addonSettings.newValue) {
      currentSettings = { ...DEFAULT_SETTINGS, ...changes.addonSettings.newValue };
      console.log('✅ バックグラウンドの設定を更新しました:', currentSettings);
    }
  }
});

// フラグをリセットする関数
function resetFlags() {
  console.log("🔄 フラグをリセットします");
  warningShown = false;
  privacyEnhancementShown = false;
}

// 送信元メールアドレスを抽出する関数
function extractMyEmail(fromField) {
  console.log("📧 送信元アドレス抽出開始:", fromField);
  
  if (!fromField) {
    console.log("❌ fromFieldが空です");
    return null;
  }
  
  let emailAddress = null;
  
  // 1. オブジェクト形式の場合
  if (typeof fromField === 'object' && fromField.address) {
    emailAddress = fromField.address;
    console.log("📧 オブジェクト形式から抽出:", emailAddress);
  }
  // 2. 文字列形式の場合
  else if (typeof fromField === 'string') {
    // 2-1. 直接メールアドレスの場合
    if (EMAIL_REGEX.test(fromField)) {
      emailAddress = fromField;
      console.log("📧 直接メールアドレス:", emailAddress);
    }
    // 2-2. "名前 <メールアドレス>" 形式の場合
    else {
      const match = fromField.match(/<([^>]+)>/);
      if (match && EMAIL_REGEX.test(match[1])) {
        emailAddress = match[1];
        console.log("📧 名前付き形式から抽出:", emailAddress);
      }
      // 2-3. その他の形式を試行
      else {
        // スペースで区切って最後の部分をメールアドレスとして試行
        const parts = fromField.trim().split(/\s+/);
        const lastPart = parts[parts.length - 1];
        if (EMAIL_REGEX.test(lastPart)) {
          emailAddress = lastPart;
          console.log("📧 分割抽出:", emailAddress);
        }
      }
    }
  }
  
  if (emailAddress && EMAIL_REGEX.test(emailAddress)) {
    console.log("✅ 送信元アドレス抽出成功:", emailAddress);
    return emailAddress;
  } else {
    console.log("❌ 送信元アドレス抽出失敗:", fromField);
    return null;
  }
}

// プライバシー保護強化機能
async function enhancePrivacy(tabId, composeDetails) {
  console.log("🔒 プライバシー保護強化機能を開始");
  
  if (!getSetting('privacyEnhancement')) {
    console.log("⚠️ プライバシー保護強化機能は無効です");
    return false;
  }
  
  const toAddresses = parseEmailAddresses(composeDetails.to);
  const bccAddresses = parseEmailAddresses(composeDetails.bcc);
  
  console.log("📧 TOアドレス数:", toAddresses.length);
  console.log("📧 BCCアドレス数:", bccAddresses.length);
  
  // TO欄が空でBCC欄に複数アドレスがある場合
  if (toAddresses.length === 0 && bccAddresses.length > 1) {
    console.log("🔒 プライバシー保護強化の条件を満たしています");
    
    // 送信元アドレスを取得
    const myEmail = extractMyEmail(composeDetails.from);
    
    if (!myEmail) {
      console.log("❌ 送信元アドレスが取得できませんでした");
      return false;
    }
    
    // ユーザーに確認
    const confirmed = await showPrivacyEnhancementDialog(tabId, myEmail, bccAddresses.length);
    
    if (confirmed) {
      console.log("✅ プライバシー保護強化を実行します");
      
      try {
        // TO欄に送信元アドレスを追加
        await browser.compose.setComposeDetails(tabId, {
          to: [myEmail]
        });
        
        console.log("✅ TO欄に送信元アドレスを追加しました:", myEmail);
        
        // 成功通知
        if (getSetting('showNotifications')) {
          await browser.notifications.create('privacy-enhanced-' + Date.now(), {
            type: 'basic',
            iconUrl: '',
            title: '🔒 プライバシー保護強化完了',
            message: `送信元アドレスをTO欄に追加しました。BCC欄の${bccAddresses.length}個のアドレスは相互に非表示です。`
          });
        }
        
        return true;
      } catch (error) {
        console.error("❌ TO欄の更新に失敗しました:", error);
        return false;
      }
    } else {
      console.log("❌ ユーザーがプライバシー保護強化をキャンセルしました");
      
      // キャンセル時のガイダンス通知
      if (getSetting('showNotifications')) {
        await browser.notifications.create('privacy-enhancement-cancel-' + Date.now(), {
          type: 'basic',
          iconUrl: '',
          title: '📋 プライバシー保護に関するガイダンス',
          message: `BCC欄のアドレスは相互に見えません。現在の設定で送信を続行できますが、一部のメールサーバーではTO欄が空の場合にエラーが発生する可能性があります。`
        });
      }
      
      return false;
    }
  }
  
  console.log("🔒 プライバシー保護強化の条件を満たしていません");
  return false;
}

// プライバシー保護強化の確認ダイアログ（改良版）
async function showPrivacyEnhancementDialog(tabId, myEmail, bccCount) {
  console.log("🔒 プライバシー保護強化確認ダイアログを表示");
  
  // 重複防止
  if (privacyEnhancementShown) {
    console.log("⚠️ プライバシー保護強化ダイアログは既に表示されています。重複を防止します。");
    return true; // 既に表示済みの場合は自動的に有効にする
  }
  
  privacyEnhancementShown = true;
  
  try {
    // 方法1: システム通知（常に動作）
    if (getSetting('showNotifications')) {
      await browser.notifications.create('privacy-enhancement-confirm-' + Date.now(), {
        type: 'basic',
        iconUrl: '',
        title: '🔒 プライバシー保護強化の提案',
        message: `TO欄が空ですが、BCC欄に${bccCount}個のアドレスがあります。送信元アドレスをTO欄に自動追加します。`
      });
    }
    
    // 方法2: アラートダイアログによる確認（TO欄警告と同じ方式）
    console.log("🔒 アラートダイアログによる確認を開始します");
    
    const confirmRequired = getSetting('privacyEnhancementConfirm');
    
    if (!confirmRequired) {
      console.log("🔒 確認設定が無効なため、自動的にプライバシー保護強化を実行します");
      return true;
    }
    
    // アラートダイアログを表示
    try {
      await browser.tabs.executeScript(tabId, {
        code: `
          try {
            if (window.confirm) {
              const confirmed = confirm(
                "🔒 プライバシー保護強化の提案\\n\\n" +
                "TO欄が空ですが、BCC欄に${bccCount}個のアドレスがあります。\\n\\n" +
                "送信元アドレス (${myEmail}) をTO欄に自動追加しますか？\\n\\n" +
                "✓ メリット: 受信者間の相互可視性を完全遮断\\n" +
                "⚠️ 注意: 一部のメールクライアントで「自分宛て」と表示される場合があります\\n\\n" +
                "「OK」で自動追加、「キャンセル」で手動調整"
              );
              
              // 結果をローカルストレージに保存
              localStorage.setItem('privacyEnhancementConfirmed', confirmed);
              console.log("🔒 プライバシー保護強化確認結果を保存:", confirmed);
            }
          } catch (e) {
            console.error("プライバシー保護強化確認エラー:", e);
            localStorage.setItem('privacyEnhancementConfirmed', false);
          }
        `
      });
      
      // 結果を取得
      const result = await browser.tabs.executeScript(tabId, {
        code: `
          try {
            const confirmed = localStorage.getItem('privacyEnhancementConfirmed');
            localStorage.removeItem('privacyEnhancementConfirmed');
            console.log("🔒 取得した確認結果:", confirmed);
            confirmed === 'true';
          } catch (e) {
            console.error("確認結果取得エラー:", e);
            false;
          }
        `
      });
      
      const userConfirmed = result[0].result;
      console.log("🔒 ユーザーの選択:", userConfirmed);
      
      if (userConfirmed) {
        console.log("✅ ユーザーがプライバシー保護強化を許可しました");
        return true;
      } else {
        console.log("❌ ユーザーがプライバシー保護強化をキャンセルしました");
        return false;
      }
      
    } catch (alertError) {
      console.log("アラートダイアログ表示エラー:", alertError.message);
      
      // アラートが失敗した場合の代替手段（システム通知）
      console.log("🔒 アラートダイアログが失敗したため、システム通知で代替します");
      
      if (getSetting('showNotifications')) {
        await browser.notifications.create('privacy-enhancement-fallback-' + Date.now(), {
          type: 'basic',
          iconUrl: '',
          title: '🔒 プライバシー保護強化の確認',
          message: `TO欄が空です。BCC欄の${bccCount}個のアドレスを保護するため、送信元アドレス (${myEmail}) をTO欄に追加しますか？`
        });
      }
      
      // 代替手段でも5秒間待機
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log("🔒 代替手段のタイムアウト - デフォルトで許可します");
      return true;
    }
    
  } catch (error) {
    console.error("❌ プライバシー保護強化確認ダイアログエラー:", error);
    
    // エラーの場合も自動的に有効にする（安全のため）
    console.log("🔒 エラーのため、自動的にプライバシー保護強化を有効にします");
    
    if (getSetting('showNotifications')) {
      await browser.notifications.create('privacy-enhancement-error-' + Date.now(), {
        type: 'basic',
        iconUrl: '',
        title: '🔒 プライバシー保護強化を自動実行',
        message: `エラーのため確認ダイアログが表示できませんでした。自動的に送信元アドレスをTO欄に追加します。`
      });
    }
    
    return true; // エラーの場合も自動的に有効にする
  }
}

// TO欄のメールアドレスを解析する関数（改善版）
function parseEmailAddresses(recipients) {
  if (getSetting('enableLogging')) {
    console.log("📧 parseEmailAddresses 呼び出し:", recipients);
  }
  
  if (!recipients || recipients.length === 0) {
    if (getSetting('enableLogging')) {
      console.log("recipients が空です");
    }
    return [];
  }
  
  const addresses = [];
  
  recipients.forEach(recipient => {
    if (getSetting('enableLogging')) {
      console.log("📧 個別recipient処理:", recipient);
    }
    
    let emailAddress = null;
    
    // 1. オブジェクト形式の場合
    if (typeof recipient === 'object' && recipient.address) {
      emailAddress = recipient.address;
      if (getSetting('enableLogging')) {
        console.log("📧 オブジェクト形式から抽出:", emailAddress);
      }
    }
    // 2. 文字列形式の場合
    else if (typeof recipient === 'string') {
      // 2-1. 直接メールアドレスの場合
      if (EMAIL_REGEX.test(recipient)) {
        emailAddress = recipient;
        if (getSetting('enableLogging')) {
          console.log("📧 直接メールアドレス:", emailAddress);
        }
      }
      // 2-2. "名前 <メールアドレス>" 形式の場合
      else {
        const match = recipient.match(/<([^>]+)>/);
        if (match && EMAIL_REGEX.test(match[1])) {
          emailAddress = match[1];
          if (getSetting('enableLogging')) {
            console.log("📧 名前付き形式から抽出:", emailAddress);
          }
        }
        // 2-3. その他の形式を試行
        else {
          // スペースで区切って最後の部分をメールアドレスとして試行
          const parts = recipient.trim().split(/\s+/);
          const lastPart = parts[parts.length - 1];
          if (EMAIL_REGEX.test(lastPart)) {
            emailAddress = lastPart;
            if (getSetting('enableLogging')) {
              console.log("📧 分割抽出:", emailAddress);
            }
          }
        }
      }
    }
    
    // 有効なメールアドレスを配列に追加
    if (emailAddress && EMAIL_REGEX.test(emailAddress)) {
      addresses.push(emailAddress);
      if (getSetting('enableLogging')) {
        console.log("📧 有効なアドレスとして追加:", emailAddress);
      }
    } else {
      if (getSetting('enableLogging')) {
        console.log("📧 無効なアドレス:", recipient);
      }
    }
  });
  
  if (getSetting('enableLogging')) {
    console.log("📧 最終的に解析されたアドレス:", addresses);
  }
  return addresses;
}

// 誤送信チェック関数（強化版）
async function checkForMisend(tabId) {
  console.log("🔍 checkForMisend 呼び出し - tabId:", tabId);
  
  try {
    // 作成中のメールの詳細を取得
    const composeDetails = await browser.compose.getComposeDetails(tabId);
    console.log("📋 取得したメール詳細:", composeDetails);
    
    // プライバシー保護強化機能を実行
    const privacyEnhanced = await enhancePrivacy(tabId, composeDetails);
    
    // プライバシー保護強化が実行された場合、再度詳細を取得
    if (privacyEnhanced) {
      console.log("🔄 プライバシー保護強化後、再度メール詳細を取得");
      const updatedDetails = await browser.compose.getComposeDetails(tabId);
      console.log("📋 更新されたメール詳細:", updatedDetails);
      
      // 更新された詳細でチェックを続行
      return await performMisendCheck(tabId, updatedDetails);
    } else {
      // 通常のチェックを実行（プライバシー保護強化が実行されなかった場合）
      console.log("🔄 プライバシー保護強化は実行されませんでした。通常のチェックを実行します。");
      return await performMisendCheck(tabId, composeDetails);
    }
    
  } catch (error) {
    console.error("❌ メール詳細の取得中にエラーが発生しました:", error);
    // エラーの場合も安全のため送信を停止
    console.error("🚨 エラーのため送信を停止します");
    return true;
  }
}

// 誤送信チェックの実際の処理
async function performMisendCheck(tabId, composeDetails) {
  console.log("🔍 performMisendCheck 開始");
  console.log("📋 tabId:", tabId);
  console.log("📋 入力されたcomposeDetails:", composeDetails);
  
  const toAddresses = parseEmailAddresses(composeDetails.to);
  const ccAddresses = parseEmailAddresses(composeDetails.cc);
  const bccAddresses = parseEmailAddresses(composeDetails.bcc);
  
  console.log("📧 TOアドレス一覧:", toAddresses);
  console.log("📧 CCアドレス一覧:", ccAddresses);
  console.log("📧 BCCアドレス一覧:", bccAddresses);
  console.log("📧 TOアドレス数:", toAddresses.length);

  // TO欄に複数のメールアドレスがある場合に警告
  if (toAddresses.length > 1) {
    console.log("⚠️ 複数のTOアドレスが検出されました!");
    console.log("検出されたアドレス:", toAddresses);
    console.log("🚨 TO欄警告処理を開始します");
    
    // 警告ダイアログを表示
    const warningResult = await showWarningDialog(tabId, toAddresses, "TO");
    console.log("🚨 TO欄警告処理結果:", warningResult);
    
    return true; // 送信を停止
  } 
  // CC欄に複数のメールアドレスがある場合の処理（設定に応じて）
  else if (ccAddresses.length > 1) {
    console.log("⚠️ 複数のCCアドレスが検出されました!");
    console.log("検出されたアドレス:", ccAddresses);
    
    // CC欄の複数アドレス送信が許可されているかチェック
    const ccMultipleAllowed = getSetting('ccMultipleAllowed');
    console.log("🔧 CC欄複数アドレス許可設定:", ccMultipleAllowed);
    
    if (ccMultipleAllowed) {
      console.log("✅ CC欄の複数アドレス送信が許可されています。送信を続行します。");
      return false; // 送信を続行
    } else {
      console.log("🚨 CC欄警告処理を開始します");
      
      // 警告ダイアログを表示
      const warningResult = await showWarningDialog(tabId, ccAddresses, "CC");
      console.log("🚨 CC欄警告処理結果:", warningResult);
      
      return true; // 送信を停止
    }
  } else if (toAddresses.length === 1) {
    console.log("✅ TOアドレスは1つです。送信を続行します。");
  } else if (toAddresses.length === 0 && bccAddresses.length > 0) {
    console.log("✅ BCCアドレスのみでの送信です。送信を続行します。");
  } else {
    console.log("✅ 送信を続行します。");
  }
    
  return false; // 送信を続行
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
    if (getSetting('showNotifications')) {
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
    }
    
    // 方法2: コンソールに目立つ警告を表示（常に動作）
    console.error("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
    console.error("🚨 誤送信防止警告 🚨");
    console.error("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
    console.error(`${fieldType}欄に${addresses.length}個のメールアドレスが検出されました！`);
    console.error("検出されたアドレス:", addresses);
    console.error("送信が停止されました。BCC欄を使用してください。");
    console.error("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
    
    // 方法3: コンポーズタブでの直接スクリプト実行（改良版）
    try {
      console.log("🔍 タブID確認:", tabId, "型:", typeof tabId);
      
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
      
      // アラートダイアログを表示（より堅牢な方法）
      try {
        const alertScript = `
          try {
            if (window.alert) {
              alert("⚠️ 誤送信防止警告\\n\\n${fieldType}欄に複数のメールアドレスが検出されました。\\n\\n検出されたアドレス:\\n• ${addresses.join('\\n• ')}\\n\\nBCC欄を使用することを推奨します。\\n\\n送信が停止されました。");
            }
          } catch (e) {
            console.error("アラート表示内部エラー:", e);
          }
        `;
        
        await browser.tabs.executeScript(tabId, {
          code: alertScript
        });
        console.log("✅ アラートダイアログを表示しました");
      } catch (alertError) {
        console.log("アラート表示エラー:", alertError.message);
        
        // アラートが失敗した場合の代替手段（confirm を使用）
        try {
          await browser.tabs.executeScript(tabId, {
            code: `
              if (window.confirm) {
                confirm("⚠️ 誤送信防止警告\\n\\n${fieldType}欄に複数のメールアドレスが検出されました。\\n\\n検出されたアドレス:\\n• ${addresses.join('\\n• ')}\\n\\nBCC欄を使用することを推奨します。\\n\\n送信が停止されました。\\n\\n「OK」で確認");
              }
            `
          });
          console.log("✅ 代替確認ダイアログを表示しました");
        } catch (confirmError) {
          console.log("確認ダイアログ表示エラー:", confirmError.message);
        }
      }
    } catch (tabError) {
      console.log("タブ操作エラー:", tabError.message);
      console.log("タブIDの詳細:", tabId);
    }
    
    // 方法4: 複数の追加通知（時間差で確実に表示）
    if (getSetting('showNotifications')) {
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
    }
    
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
  
  // 設定を読み込み
  await loadSettings();
  
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
            // キャンセル時にフラグをリセット
            resetFlags();
            return { cancel: true };
          }
          
          console.log("✅ 送信を続行します");
          // 送信完了時にもフラグをリセット
          resetFlags();
          return { cancel: false };
        } catch (error) {
          console.error("❌ 送信前チェックでエラーが発生しました:", error);
          // エラーの場合もフラグをリセット
          resetFlags();
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
      
      // 設定関連のメッセージ処理
      if (request.action === 'getSettings') {
        sendResponse({ settings: currentSettings });
        return true;
      }
      
      if (request.action === 'updateSetting') {
        updateSetting(request.key, request.value).then(success => {
          sendResponse({ success: success });
        });
        return true;
      }
      
      // pingメッセージの処理（接続確認用）
      if (request.action === 'ping') {
        sendResponse({ status: 'ok', timestamp: Date.now() });
        return true;
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
let privacyEnhancementShown = false; // プライバシー保護強化ダイアログの重複防止

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
    console.log("プライバシー保護強化機能:", getSetting('privacyEnhancement') ? "有効" : "無効");
    console.log("CC欄複数アドレス送信:", getSetting('ccMultipleAllowed') ? "許可" : "禁止");
    console.log("通知表示:", getSetting('showNotifications') ? "有効" : "無効");
    console.log("ログ出力:", getSetting('enableLogging') ? "有効" : "無効");
    console.log("===================");
  }, 1000);
});

// 起動時の初期化
initializeAddon();

console.log("=== バックグラウンドスクリプトの初期化完了 ==="); 