// Thunderbird 誤送信防止アドオン - コンテンツスクリプト
// 作成者: AKIO OGAWA
// 作成日: 2025年8月23日
// 最終更新: 2025年8月23日 (v1.1.4 - CC欄警告修正版)

console.log("=== コンテンツスクリプトが読み込まれました ===");

// 送信ボタンの監視と送信検知
function setupSendButtonMonitoring() {
  console.log("🔍 送信ボタンの監視を開始します");
  
  // 送信ボタンのセレクター（複数パターン）
  const sendButtonSelectors = [
    'button[data-command="cmd_sendMessage"]',
    'button[command="cmd_sendMessage"]',
    '#button-send',
    '.send-button',
    'button:contains("送信")',
    'button:contains("Send")',
    '[data-l10n-id="compose-send-button"]'
  ];
  
  // 送信ボタンを監視する関数
  function monitorSendButton() {
    sendButtonSelectors.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        if (!button.hasAttribute('data-misend-monitored')) {
          console.log("📧 送信ボタンを監視対象に追加:", button);
          button.setAttribute('data-misend-monitored', 'true');
          
          // クリックイベントを監視
          button.addEventListener('click', async (event) => {
            console.log("🚀 送信ボタンがクリックされました");
            
            // 少し遅延させてからチェック（メール詳細が更新されるまで待つ）
            setTimeout(async () => {
              try {
                // バックグラウンドスクリプトにメッセージを送信
                const response = await browser.runtime.sendMessage({
                  action: 'checkMisend',
                  tabId: browser.tabs.TAB_ID_NONE // 現在のタブIDを取得
                });
                
                if (response && response.cancel) {
                  console.log("❌ 送信がキャンセルされました");
                  event.preventDefault();
                  event.stopPropagation();
                  return false;
                }
              } catch (error) {
                console.error("❌ 送信チェックエラー:", error);
                // エラーの場合は安全のため送信を停止
                event.preventDefault();
                event.stopPropagation();
                return false;
              }
            }, 100);
          });
        }
      });
    });
  }
  
  // 初期監視
  monitorSendButton();
  
  // DOM変更を監視（動的に追加されるボタンに対応）
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        monitorSendButton();
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log("✅ 送信ボタン監視が設定されました");
}

// ページ読み込み完了時に実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSendButtonMonitoring);
} else {
  setupSendButtonMonitoring();
}

// バックアップ: 少し遅延してから実行
setTimeout(setupSendButtonMonitoring, 1000);

console.log("=== コンテンツスクリプトの初期化完了 ===");

