# Manifest V3対応と警告修正ガイド

**最終更新**: 2025年1月9日

## 検証警告の修正

### 1. permissions警告の修正

現在のmanifest.json:
```json
"permissions": [
  "compose",
  "notifications",
  "tabs",
  "activeTab"
]
```

修正版:
```json
"permissions": [
  "notifications",
  "tabs",
  "activeTab"
],
"host_permissions": [
  "*://*/*"
]
```

### 2. applications警告の修正

現在のmanifest.json:
```json
"applications": {
  "gecko": {
    "id": "misend-prevention@example.com",
    "strict_min_version": "78.0",
    "strict_max_version": "150.*"
  }
}
```

修正版:
```json
"browser_specific_settings": {
  "gecko": {
    "id": "misend-prevention@example.com",
    "strict_min_version": "78.0"
  }
}
```

### 3. strict_max_version警告の修正

`strict_max_version` を削除して、将来のバージョンに対応できるようにします。

### 4. CSP警告の修正

`create-icons.html` を削除するか、別の方法でアイコンを生成します。

## 修正版manifest.json

```json
{
  "manifest_version": 2,
  "name": "Thunderbird 誤送信防止アドオン",
  "version": "1.1.4",
  "description": "TO欄・CC欄に複数のメールアドレスがある場合の誤送信を防止します",
  "author": "AKIO OGAWA",
  
  "browser_specific_settings": {
    "gecko": {
      "id": "misend-prevention@example.com",
      "strict_min_version": "78.0"
    }
  },
  
  "permissions": [
    "notifications",
    "tabs",
    "activeTab"
  ],
  
  "host_permissions": [
    "*://*/*"
  ],
  
  "background": {
    "scripts": ["background.js"],
    "persistent": true
  },
  
  "content_scripts": [
    {
      "matches": ["*://*/*"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ]
}
```

## 修正の必要性

### 現在の状況
- **検証合格**: アドオンは正常に動作
- **警告のみ**: エラーはない
- **Thunderbird対応**: Thunderbirdでは正常に動作

### 修正の判断
- **即座の修正**: 不要（検証に合格している）
- **将来の対応**: 必要に応じて修正
- **Manifest V3**: 将来的な対応として検討

## 推奨アクション

### 1. 現在の申請を続行
- 検証に合格しているので、そのまま申請を続行
- 警告は機能に影響しない

### 2. 将来的な修正
- v1.2.0でManifest V3対応を検討
- 警告の修正を実施
- より広い互換性を確保

### 3. 申請後の対応
- 審査結果を待つ
- 承認された場合は公開
- 却下された場合は修正版を再提出

---

**結論**: 現在のアドオンは検証に合格しているため、そのまま申請を続行することを推奨します。
