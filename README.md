# YoutubeGrabber - 網頁版操作指南 🌻

本專案為 **Youtube 擷取工具網頁版**，所有影片下載、剪輯與語音辨識運算皆在您的本機電腦上執行，提供極致美觀、自適應的網頁操作面板。

---

## 🛠️ 準備工作

### 1. 安裝 Python 環境
確保您的電腦上已安裝 Python 3.8+ 並且已加入系統環境變數 (Path)。

### 2. 安裝 Python 依賴庫
在專案目錄下執行以下指令以安裝必要的 Python 庫：
```bash
pip install -r requirements.txt
```

---

## 🚀 啟動與隨攜使用方式

本專案已重構為 **「C# 啟動器外殼 + 外置 Python 背景服務」** 的現代化架構。

### 雙擊執行 `SunflowerLauncher.exe`
1. 雙擊執行目錄下的 `SunflowerLauncher.exe`。
2. 啟動後，它會自動將 Python 服務與網頁端資源解壓至暫存資料夾，並於背景執行。
3. **工作目錄定位**：啟動器會自動將執行路徑鎖定在 `SunflowerLauncher.exe` 所在的資料夾下。
   * **所有下載的影片、剪輯結果以及 Whisper 語音辨識的文字檔，都會直接儲存在該執行檔所在的資料夾下**，具備完美的隨攜性與綠色軟體特質。
4. **瀏覽器自動對接**：啟動器啟動後會自動開啟瀏覽器導向網頁端操作面板！
   * 您也可以隨時點選此連結訪問：[https://FirePhoenix1001.github.io/WedTest/](https://FirePhoenix1001.github.io/WedTest/)

---

## 💎 特色功能與設計

### 1. 單一執行實例 (Single Instance) 保證
* 每次雙擊 `SunflowerLauncher.exe` 時，啟動器會自動檢查並終止其他已在執行的啟動器實例，並強制清理佔用 Port 8000 的背景進程，**解決重複啟動導致瀏覽器瘋狂開啟、背景程序重疊佔用處理器的問題**。

### 2. 啟動面板與依賴背景下載 (Splash Console)
* 首次執行或當缺少核心組件（`ffmpeg.exe`、`ffprobe.exe` 或 `yt-dlp.exe`）時，會彈出精緻的**暗黑風格啟動面板**，實時輸出背景下載日誌並渲染進度條。
* 下載與初始化完成後，啟動面板會自動隱藏，提供流暢的開箱即用體驗。

### 3. 系統工作列常駐與徹底關閉 (System Tray)
* 啟動完成後，工作列右下角的隱藏圖示區會常駐一個向日葵圖示 🌻。
* 右鍵點選圖示可開啟選單：
  * **開啟向日葵網頁端**：快速在瀏覽器中開啟操作網頁。
  * **顯示日誌控制台**：重新呼叫出啟動面板以檢視下載或運作日誌。
  * **結束並關閉伺服器**：**徹底且乾淨地關閉**啟動器程序與所有 Python 後端進程，釋放系統資源。

### 4. yt-dlp.exe 自動下載與背景升級
* 無須手動安裝。每次啟動時，後端會自動在背景執行 `yt-dlp.exe --update`，確保 YouTube 下載引擎永遠處於最新版，徹底告別因 YouTube 演算法更新而導致的下載 403 報錯。

---

## 🛠️ 如何重新編譯啟動器

如果您修改了 `src/` 中的 Python 原始碼，或是修改了 `src/static/` 下的 HTML、CSS 或 JavaScript，您需要將這些檔案重新打包進 C# 資源中：

1. 雙擊執行專案根目錄下的 `compile_launcher.bat`。
2. 該批次檔會調用系統內建的 `.NET csc.exe` 編譯器，將所有 Python 程式碼、網頁資源與 `src/SunflowerLauncher.cs` 打包為單一執行檔 `SunflowerLauncher.exe`。
3. 編譯完成後，即可將全新的 `SunflowerLauncher.exe` 拖曳到任何地方使用。

---

## 📂 檔案管理與 Git 忽略規則

為了避免專案庫被下載的大型媒體檔案與組件二進位檔污染，`.gitignore` 已設定忽略以下內容：
* 所有 `*.mp4`, `*.mp3`, `*.webm`, `*.mkv`, `*.txt` 等媒體/文字檔案。
* `tools/` 資料夾（存放下載的 `ffmpeg.exe`、`ffprobe.exe` 與 `yt-dlp.exe`）。
* 暫存與解除安裝標記檔案 `uninstall.flag`。