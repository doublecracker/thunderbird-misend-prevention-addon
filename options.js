// Thunderbird 誤送信防止アドオン - 設定画面スクリプト
// 作成者: AKIO OGAWA
// 作成日: 2025年8月23日
// 最終更新: 2025年8月23日

// デフォルト設定
const DEFAULT_SETTINGS = {
  privacyEnhancement: true,
  ccMultipleAllowed: false,
  showNotifications: true,
  enableLogging: true
};

// 設定要素のIDリスト
const SETTING_IDS = [
  'privacyEnhancement',
  'ccMultipleAllowed',
  'showNotifications',
  'enableLogging'
];

// 現在の設定
let currentSettings = { ...DEFAULT_SETTINGS };

// 設定を読み込む関数
async function loadSettings() {
  try {
    const response = await browser.runtime.sendMessage({ action: 'getSettings' });
    if (response && response.settings) {
      currentSettings = { ...DEFAULT_SETTINGS, ...response.settings };
      console.log('設定を読み込みました:', currentSettings);
    }
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
    currentSettings = { ...DEFAULT_SETTINGS };
  }
  
  // UIに設定を反映
  updateUI();
}

// 設定を保存する関数
async function saveSettings() {
  try {
    // 現在のUIの状態を取得
    const newSettings = {};
    SETTING_IDS.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        newSettings[id] = element.checked;
      }
    });
    
    // 各設定を個別に更新
    for (const [key, value] of Object.entries(newSettings)) {
      await browser.runtime.sendMessage({
        action: 'updateSetting',
        key: key,
        value: value
      });
    }
    
    currentSettings = { ...newSettings };
    showStatus('設定を保存しました', 'success');
    console.log('設定を保存しました:', currentSettings);
    
  } catch (error) {
    console.error('設定の保存に失敗しました:', error);
    showStatus('設定の保存に失敗しました', 'error');
  }
}

// 設定をリセットする関数
async function resetSettings() {
  try {
    // 各設定をデフォルト値に戻す
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await browser.runtime.sendMessage({
        action: 'updateSetting',
        key: key,
        value: value
      });
    }
    
    currentSettings = { ...DEFAULT_SETTINGS };
    updateUI();
    showStatus('設定をデフォルトに戻しました', 'success');
    console.log('設定をリセットしました:', currentSettings);
    
  } catch (error) {
    console.error('設定のリセットに失敗しました:', error);
    showStatus('設定のリセットに失敗しました', 'error');
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

// 設定変更時の自動保存（オプション）
function setupAutoSave() {
  SETTING_IDS.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', async (event) => {
        const key = event.target.id;
        const value = event.target.checked;
        
        try {
          await browser.runtime.sendMessage({
            action: 'updateSetting',
            key: key,
            value: value
          });
          
          currentSettings[key] = value;
          showStatus(`${getSettingLabel(key)}を${value ? '有効' : '無効'}にしました`, 'success');
          
        } catch (error) {
          console.error('設定の更新に失敗しました:', error);
          showStatus('設定の更新に失敗しました', 'error');
        }
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
    enableLogging: '詳細ログ'
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

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('設定画面を初期化中...');
  
  try {
    // 設定を読み込み
    await loadSettings();
    
    // イベントリスナーを設定
    setupEventListeners();
    
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
