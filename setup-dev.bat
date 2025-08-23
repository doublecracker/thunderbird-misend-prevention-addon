@echo off
echo Thunderbird 誤送信防止アドオン - 開発環境セットアップ
echo ================================================

echo.
echo 1. Node.jsの確認...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo エラー: Node.jsがインストールされていません。
    echo https://nodejs.org/ からNode.jsをインストールしてください。
    pause
    exit /b 1
)
echo Node.jsが見つかりました。

echo.
echo 2. web-extツールのインストール...
npm install -g web-ext
if %errorlevel% neq 0 (
    echo エラー: web-extツールのインストールに失敗しました。
    pause
    exit /b 1
)
echo web-extツールがインストールされました。

echo.
echo 3. プロジェクト依存関係のインストール...
npm install
if %errorlevel% neq 0 (
    echo エラー: 依存関係のインストールに失敗しました。
    pause
    exit /b 1
)
echo 依存関係がインストールされました。

echo.
echo 4. アドオンのビルド...
npm run build
if %errorlevel% neq 0 (
    echo エラー: アドオンのビルドに失敗しました。
    pause
    exit /b 1
)
echo アドオンがビルドされました。

echo.
echo ================================================
echo セットアップが完了しました！
echo.
echo 次の手順でアドオンをテストできます：
echo 1. Thunderbirdを起動
echo 2. about:debugging を開く
echo 3. 「このThunderbird」タブを選択
echo 4. 「一時的なアドオンを読み込み」でmanifest.jsonを選択
echo.
echo 開発用コマンド：
echo - npm run build  : アドオンをビルド
echo - npm run run    : Thunderbirdでアドオンを実行
echo - npm run lint   : コードをチェック
echo.
pause 