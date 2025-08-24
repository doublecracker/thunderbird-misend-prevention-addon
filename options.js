// Thunderbird 誤送信防止アドオン - 設定画面スクリプト
// 作成者: AKIO OGAWA
// 作成日: 2025年8月23日
// 最終更新: 2025年8月24日

// デフォルト設定
const DEFAULT_SETTINGS = {
  privacyEnhancement: true,
  ccMultipleAllowed: false,
  showNotifications: true,
  enableLogging: true,
  privacyEnhancementConfirm: true
};

// 設定要素のIDリスト
const SETTING_IDS = [
  'privacyEnhancement',
  'ccMultipleAllowed',
  'showNotifications',
  'enableLogging',
  'privacyEnhancementConfirm'
];

// 現在の設定
let currentSettings = { ...DEFAULT_SETTINGS };

// 設定を読み込む関数（ローカルストレージ直接アクセス）
async function loadSettings() {
  try {
    console.log('設定をローカルストレージから読み込み中...');
    const stored = await browser.storage.local.get('addonSettings');
    
    if (stored.addonSettings) {
      currentSettings = { ...DEFAULT_SETTINGS, ...stored.addonSettings };
      console.log('設定を読み込みました:', currentSettings);
      showStatus('設定を読み込みました', 'success');
    } else {
      // 初回起動時はデフォルト設定を保存
      await saveSettings(currentSettings);
      console.log('デフォルト設定を保存しました:', currentSettings);
      showStatus('デフォルト設定を初期化しました', 'success');
    }
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
    currentSettings = { ...DEFAULT_SETTINGS };
    showStatus('設定の読み込みに失敗しました。デフォルト設定を使用しています。', 'error');
  }
  
  // UIに設定を反映
  updateUI();
}

// 設定を保存する関数（ローカルストレージ直接アクセス）
async function saveSettings(settingsToSave = null) {
  try {
    let newSettings;
    
    if (settingsToSave) {
      // 引数で設定が渡された場合（デフォルト設定の初期化時など）
      newSettings = settingsToSave;
    } else {
      // 現在のUIの状態を取得
      newSettings = {};
      SETTING_IDS.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          newSettings[id] = element.checked;
        }
      });
    }
    
    // ローカルストレージに保存
    await browser.storage.local.set({ addonSettings: newSettings });
    currentSettings = { ...newSettings };
    
    console.log('設定を保存しました:', currentSettings);
    if (!settingsToSave) {
      showStatus('設定を保存しました', 'success');
    }
    
    return true;
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    if (!settingsToSave) {
      showStatus('設定の保存に失敗しました', 'error');
    }
    return false;
  }
}

// 設定をリセットする関数（ローカルストレージ直接アクセス）
async function resetSettings() {
  try {
    // デフォルト設定をローカルストレージに保存
    await browser.storage.local.set({ addonSettings: DEFAULT_SETTINGS });
    currentSettings = { ...DEFAULT_SETTINGS };
    
    updateUI();
    showStatus('設定をデフォルトに戻しました', 'success');
    console.log('設定をリセットしました:', currentSettings);
    
    return true;
  } catch (error) {
    console.error('設定のリセットに失敗しました:', error);
    showStatus('設定のリセットに失敗しました', 'error');
    return false;
  }
}

// 個別設定を更新する関数
async function updateSingleSetting(key, value) {
  try {
    // 純粋なオブジェクトのみを作成（イベントオブジェクトの参照を避ける）
    const newSettings = {
      privacyEnhancement: currentSettings.privacyEnhancement,
      ccMultipleAllowed: currentSettings.ccMultipleAllowed,
      showNotifications: currentSettings.showNotifications,
      enableLogging: currentSettings.enableLogging,
      privacyEnhancementConfirm: currentSettings.privacyEnhancementConfirm,
      [key]: value
    };
    
    await browser.storage.local.set({ addonSettings: newSettings });
    currentSettings = newSettings;
    
    console.log(`設定を更新しました: ${key} = ${value}`);
    showStatus(`${getSettingLabel(key)}を${value ? '有効' : '無効'}にしました`, 'success');
    
    return true;
  } catch (error) {
    console.error(`設定の更新に失敗しました (${key}):`, error);
    showStatus('設定の更新に失敗しました', 'error');
    return false;
  }
}

// UIを更新する関数
function updateUI() {
  SETTING_IDS.forEach(id => {
    const element = document.getElementById(id);
    if (element && currentSettings[id] !== undefined) {
      element.checked = currentSettings[id];
    }
  });
}

// ステータスメッセージを表示する関数
function showStatus(message, type) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    
    // 3秒後に非表示
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}

// 設定変更時の自動保存
function setupAutoSave() {
  SETTING_IDS.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', async (event) => {
        // イベントオブジェクトを参照しないように、必要な情報のみを取得
        const key = event.target.id;
        const value = event.target.checked;
        
        // イベントオブジェクトをクリアしてから設定を更新
        event = null;
        
        await updateSingleSetting(key, value);
      });
    }
  });
}

// 設定項目のラベルを取得する関数
function getSettingLabel(key) {
  const labels = {
    privacyEnhancement: 'プライバシー保護強化機能',
    ccMultipleAllowed: 'CC欄複数アドレス送信',
    showNotifications: 'システム通知',
    enableLogging: '詳細ログ',
    privacyEnhancementConfirm: 'プライバシー保護強化の確認'
  };
  return labels[key] || key;
}

// イベントリスナーを設定する関数
function setupEventListeners() {
  // 保存ボタン
  const saveButton = document.getElementById('saveSettings');
  if (saveButton) {
    saveButton.addEventListener('click', saveSettings);
  }
  
  // リセットボタン
  const resetButton = document.getElementById('resetSettings');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (confirm('設定をデフォルトに戻しますか？')) {
        resetSettings();
      }
    });
  }
  
  // 自動保存の設定
  setupAutoSave();
}

// ストレージ変更の監視（他のタブからの変更を反映）
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.addonSettings) {
    console.log('ストレージの変更を検出:', changes.addonSettings.newValue);
    if (changes.addonSettings.newValue) {
      currentSettings = { ...DEFAULT_SETTINGS, ...changes.addonSettings.newValue };
      updateUI();
    }
  }
});

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('設定画面を初期化中...');
  
  try {
    // イベントリスナーを設定
    setupEventListeners();
    
    // 設定を読み込み
    await loadSettings();
    
    console.log('設定画面の初期化が完了しました');
    
  } catch (error) {
    console.error('設定画面の初期化に失敗しました:', error);
    showStatus('設定画面の初期化に失敗しました', 'error');
  }
});

// エラーハンドリング
window.addEventListener('error', (event) => {
  console.error('設定画面でエラーが発生しました:', event.error);
  showStatus('エラーが発生しました', 'error');
});

// 未処理のPromise拒否のハンドリング
window.addEventListener('unhandledrejection', (event) => {
  console.error('未処理のPromise拒否:', event.reason);
  showStatus('予期しないエラーが発生しました', 'error');
});
