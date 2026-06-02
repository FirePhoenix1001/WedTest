/**
 * YoutubeGrabber - Sunflower Studio JS Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // Dynamic API Base URL for GitHub Pages support
    const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '::1') ? '' : 'http://localhost:8000';

    // DOM Elements - Navigation & Theme
    const tabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const openWorkspaceBtn = document.getElementById('open-workspace-btn');
    const dependencyBanner = document.getElementById('dependency-banner');
    const installToolsBtn = document.getElementById('install-tools-btn');
    const cleanEnvBtn = document.getElementById('clean-env-btn');

    // DOM Elements - YouTube Tab
    const downloadUrl = document.getElementById('download-url');
    const startDownloadBtn = document.getElementById('start-download-btn');

    // DOM Elements - Cut Tab
    const cutFilePath = document.getElementById('cut-file-path');
    const startH = document.getElementById('start-h');
    const startM = document.getElementById('start-m');
    const startS = document.getElementById('start-s');
    const endH = document.getElementById('end-h');
    const endM = document.getElementById('end-m');
    const endS = document.getElementById('end-s');
    const startCutBtn = document.getElementById('start-cut-btn');

    // DOM Elements - Transcribe Tab
    const transcribeFilePath = document.getElementById('transcribe-file-path');
    const whisperModelSelect = document.getElementById('whisper-model-select');
    const showTimestampsCheck = document.getElementById('show-timestamps-check');
    const startTranscribeBtn = document.getElementById('start-transcribe-btn');

    // DOM Elements - File Manager Tab
    const filesListBody = document.getElementById('files-list-body');

    // DOM Elements - Progress HUD
    const progressContainer = document.getElementById('progress-container');
    const progressTaskName = document.getElementById('progress-task-name');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressBarFill = document.getElementById('progress-bar-fill');

    // DOM Elements - Terminal Console
    const terminalConsole = document.getElementById('terminal-console');
    const clearLogsBtn = document.getElementById('clear-logs-btn');

    // Active State
    let taskCheckInterval = null;

    /* ===================================================
       1. Navigation Tabs & Theme Toggle
       =================================================== */

    // Tab switcher
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPane = document.getElementById(tab.dataset.tab);
            targetPane.classList.add('active');

            // Fetch files list if switching to File Manager
            if (tab.dataset.tab === 'tab-files') {
                loadFiles();
            }
        });
    });

    // Theme Switcher (Dark / Light)
    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.body.classList.contains('theme-dark');
        if (isDark) {
            document.body.classList.remove('theme-dark');
            document.body.classList.add('theme-light');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i> <span>淺色模式</span>';
            localStorage.setItem('sunflower-theme', 'light');
        } else {
            document.body.classList.remove('theme-light');
            document.body.classList.add('theme-dark');
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i> <span>深色模式</span>';
            localStorage.setItem('sunflower-theme', 'dark');
        }
    });

    // Read stored theme preference
    const storedTheme = localStorage.getItem('sunflower-theme');
    if (storedTheme === 'light') {
        document.body.classList.remove('theme-dark');
        document.body.classList.add('theme-light');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i> <span>淺色模式</span>';
    }

    // Open workspace folder
    openWorkspaceBtn.addEventListener('click', () => {
        fetch(API_BASE + '/api/open-folder', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (!data.success) showToast("無法開啟程式資料夾：" + data.message, "error");
            });
    });

    // Tool dependency checks and management
    function checkTools() {
        fetch(API_BASE + '/api/check-tools')
            .then(res => res.json())
            .then(data => {
                if (data.installed) {
                    dependencyBanner.classList.add('hide');
                } else {
                    dependencyBanner.classList.remove('hide');
                }
            })
            .catch(err => console.error("Error checking tools:", err));
    }

    // Check on page load
    checkTools();

    installToolsBtn.addEventListener('click', () => {
        installToolsBtn.disabled = true;
        installToolsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 下載安裝中...';
        
        fetch(API_BASE + '/api/install-tools', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast("自動下載已啟動，請在下方查看進度日誌！", "success");
                } else {
                    showToast(data.message, "error");
                    installToolsBtn.disabled = false;
                    installToolsBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> 一鍵自動安裝';
                }
            })
            .catch(err => {
                showToast("連線後端失敗", "error");
                installToolsBtn.disabled = false;
                installToolsBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> 一鍵自動安裝';
            });
    });

    cleanEnvBtn.addEventListener('click', () => {
        if (confirm("⚠️ 警告：此操作將會卸載並關閉此程式！\n這將會「永久刪除」：\n1. 您下載與處理過的所有影片和文字檔案\n2. 此專案為您安裝的 Python 與 pip 套件\n3. 本機安裝的 FFmpeg 與 FFprobe 組件\n\n確定要完全清空環境並卸載嗎？")) {
            fetch(API_BASE + '/api/clean-environment', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert(data.message);
                        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#fff;font-family:sans-serif;font-size:1.5rem;background:#1a1614;text-align:center;padding:20px;">環境卸載中，本機伺服器已關閉。<br>您可以安全地關閉此網頁瀏覽器視窗。</div>';
                    } else {
                        showToast("啟動清理失敗：" + data.message, "error");
                    }
                })
                .catch(err => showToast("連線後端失敗", "error"));
        }
    });

    /* ===================================================
       2. Real-time Logging (SSE Server-Sent Events)
       =================================================== */
    
    // Connect to Server-Sent Event log stream
    const eventSource = new EventSource(API_BASE + '/api/stream-logs');
    
    eventSource.onmessage = (event) => {
        const logLineText = event.data;
        
        // Check if log contains progress indicators: [PROGRESS] 45
        if (logLineText.startsWith('[PROGRESS]')) {
            const percent = parseInt(logLineText.replace('[PROGRESS]', '').trim());
            updateProgressHUD(percent);
            return;
        }

        // Print to log screen
        appendTerminalLog(logLineText);
    };

    eventSource.onerror = (err) => {
        console.error("SSE connection error:", err);
        appendTerminalLog("[SYSTEM] 與背景日誌服務中斷連線，正在嘗試重新連接...");
    };

    function appendTerminalLog(text) {
        if (!text || text.trim() === '') return;
        
        const line = document.createElement('div');
        line.className = 'log-line';
        
        // Add styling for special messages
        if (text.includes('[SYSTEM]')) {
            line.classList.add('system-line');
        } else if (text.includes('核心報錯:') || text.includes('失敗') || text.includes('錯誤:')) {
            line.classList.add('core-err-line');
        }
        
        line.textContent = text;
        terminalConsole.appendChild(line);
        
        // Scroll terminal to bottom
        terminalConsole.scrollTop = terminalConsole.scrollHeight;
    }

    clearLogsBtn.addEventListener('click', () => {
        terminalConsole.innerHTML = '<div class="log-line system-line">[SYSTEM] 終端機日誌已清除。</div>';
    });

    /* ===================================================
       3. Progress HUD Actions
       =================================================== */

    function updateProgressHUD(percent) {
        progressContainer.classList.remove('hide');
        progressPercentage.textContent = `${percent}%`;
        progressBarFill.style.width = `${percent}%`;

        // Auto hide progress HUD when completed
        if (percent >= 100) {
            setTimeout(() => {
                progressContainer.classList.add('hide');
                progressBarFill.style.width = `0%`;
                // Reload files automatically if tab is active
                loadFiles();
            }, 3000);
        }
    }

    // Active State for installation tracking
    let wasInstalling = false;

    // Periodic task status poller
    function startStatusPoller() {
        if (taskCheckInterval) clearInterval(taskCheckInterval);
        
        taskCheckInterval = setInterval(() => {
            fetch(API_BASE + '/api/status')
                .then(res => res.json())
                .then(data => {
                    const buttons = [startDownloadBtn, startCutBtn, startTranscribeBtn];
                    
                    if (data.active) {
                        // Disable buttons
                        buttons.forEach(btn => btn.disabled = true);
                        progressContainer.classList.remove('hide');
                        
                        let prefix = "正在執行任務...";
                        if (data.type === 'download') prefix = "📥 正在下載 YouTube 媒體...";
                        if (data.type === 'cut') prefix = "✂️ 正在進行視訊剪輯...";
                        if (data.type === 'transcribe') prefix = "🎤 AI 語音辨識中，請稍候...";
                        if (data.type === 'install') {
                            prefix = "🌻 正在下載安裝必要核心組件...";
                            wasInstalling = true;
                            installToolsBtn.disabled = true;
                            installToolsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 下載安裝中...';
                        }
                        
                        progressTaskName.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${prefix}`;
                    } else {
                        // Enable buttons
                        buttons.forEach(btn => btn.disabled = false);
                        
                        // If installation has finished, refresh UI
                        if (wasInstalling) {
                            wasInstalling = false;
                            installToolsBtn.disabled = false;
                            installToolsBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> 一鍵自動安裝';
                            checkTools();
                        }
                    }
                });
        }, 1000);
    }
    
    startStatusPoller();

    /* ===================================================
       4. Forms Action Trigger (Fetch REST API)
       =================================================== */

    // YouTube Downloader
    startDownloadBtn.addEventListener('click', () => {
        const url = downloadUrl.value.trim();
        const mode = document.querySelector('input[name="download-mode"]:checked').value;

        if (!url) {
            showToast("請輸入 YouTube 網址！", "warning");
            return;
        }

        startDownloadBtn.disabled = true;
        fetch(API_BASE + '/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, mode })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("下載任務已順利送出，請查看日誌！", "success");
            } else {
                showToast(data.message, "error");
                startDownloadBtn.disabled = false;
            }
        })
        .catch(err => {
            showToast("伺服器連線失敗", "error");
            startDownloadBtn.disabled = false;
        });
    });

    // Local Media Cut
    startCutBtn.addEventListener('click', () => {
        const input_path = cutFilePath.value.trim();
        if (!input_path) {
            showToast("請輸入本地檔案路徑或從檔案管理選擇！", "warning");
            return;
        }

        const start_time = getFormattedTime(startH, startM, startS);
        const end_time = getFormattedTime(endH, endM, endS);

        startCutBtn.disabled = true;
        fetch(API_BASE + '/api/cut', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input_path, start_time, end_time })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("剪輯任務已順利送出！", "success");
            } else {
                showToast(data.message, "error");
                startCutBtn.disabled = false;
            }
        })
        .catch(err => {
            showToast("伺服器連線失敗", "error");
            startCutBtn.disabled = false;
        });
    });

    // Voice Transcriber (Whisper)
    startTranscribeBtn.addEventListener('click', () => {
        const input_path = transcribeFilePath.value.trim();
        if (!input_path) {
            showToast("請輸入本機檔案路徑或從檔案管理選擇！", "warning");
            return;
        }

        const model_size = whisperModelSelect.value;
        const show_timestamps = showTimestampsCheck.checked;

        startTranscribeBtn.disabled = true;
        fetch(API_BASE + '/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input_path, model_size, show_timestamps })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("語音辨識任務已順利送出，這需要一些時間載入模型...", "success");
            } else {
                showToast(data.message, "error");
                startTranscribeBtn.disabled = false;
            }
        })
        .catch(err => {
            showToast("伺服器連線失敗", "error");
            startTranscribeBtn.disabled = false;
        });
    });

    function getFormattedTime(hEl, mEl, sEl) {
        const h = String(parseInt(hEl.value || 0)).padStart(2, '0');
        const m = String(parseInt(mEl.value || 0)).padStart(2, '0');
        const s = String(parseInt(sEl.value || 0)).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    /* ===================================================
       5. File Manager Functions
       =================================================== */

    function loadFiles() {
        filesListBody.innerHTML = '<tr><td colspan="4" class="empty-message"><i class="fa-solid fa-circle-notch fa-spin"></i> 載入檔案清單中...</td></tr>';
        
        fetch(API_BASE + '/api/files')
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    filesListBody.innerHTML = `<tr><td colspan="4" class="empty-message text-danger">讀取失敗：${data.message}</td></tr>`;
                    return;
                }

                if (data.files.length === 0) {
                    filesListBody.innerHTML = '<tr><td colspan="4" class="empty-message">目前目錄下尚無下載或編輯後的檔案。</td></tr>';
                    return;
                }

                filesListBody.innerHTML = '';
                data.files.forEach(file => {
                    const row = document.createElement('tr');
                    
                    // Determine file icon
                    let icon = '<i class="fa-solid fa-file"></i>';
                    const nameLower = file.name.toLowerCase();
                    if (nameLower.endsWith('.mp4') || nameLower.endsWith('.mkv') || nameLower.endsWith('.webm') || nameLower.endsWith('.mov') || nameLower.endsWith('.avi')) {
                        icon = '<i class="fa-solid fa-file-video text-warning" style="color: #ffb300;"></i>';
                    } else if (nameLower.endsWith('.mp3') || nameLower.endsWith('.wav') || nameLower.endsWith('.m4a')) {
                        icon = '<i class="fa-solid fa-file-audio text-info" style="color: #2196f3;"></i>';
                    } else if (nameLower.endsWith('.txt')) {
                        icon = '<i class="fa-solid fa-file-lines text-success" style="color: #8bc34a;"></i>';
                    }

                    // Determine file type category label
                    let fileType = '一般檔案';
                    if (nameLower.endsWith('.txt')) fileType = '辨識結果 (.txt)';
                    else if (nameLower.includes('_cut')) fileType = '編輯後檔案';
                    else if (nameLower.includes('_audio') || nameLower.endsWith('.mp3')) fileType = '擷取音訊';
                    else if (nameLower.includes('_video') || nameLower.endsWith('.mp4')) fileType = '擷取影片';

                    row.innerHTML = `
                        <td>${icon} <span class="file-name-span" title="${file.name}">${file.name}</span></td>
                        <td>${file.size_mb} MB</td>
                        <td>${fileType}</td>
                        <td class="action-row">
                            <button class="table-btn btn-play" onclick="openFileLocally('${file.path.replace(/\\/g, '\\\\')}')">
                                <i class="fa-solid fa-desktop"></i> 電腦開啟
                            </button>
                            ${!nameLower.endsWith('.txt') ? `
                                <button class="table-btn btn-cut" onclick="sendToCutter('${file.path.replace(/\\/g, '\\\\')}')">
                                    <i class="fa-solid fa-scissors"></i> 剪輯
                                </button>
                                <button class="table-btn btn-ocr" onclick="sendToTranscribe('${file.path.replace(/\\/g, '\\\\')}')">
                                    <i class="fa-solid fa-microphone-lines"></i> 辨識
                                </button>
                            ` : ''}
                            <button class="table-btn btn-delete" onclick="deleteFileLocally('${file.path.replace(/\\/g, '\\\\')}', '${file.name}')">
                                <i class="fa-solid fa-trash-can"></i> 刪除
                            </button>
                        </td>
                    `;
                    filesListBody.appendChild(row);
                });
            })
            .catch(err => {
                filesListBody.innerHTML = '<tr><td colspan="4" class="empty-message text-danger">伺服器連線失敗。</td></tr>';
            });
    }

    // Expose helpers globally so they can be triggered from onclick attributes in dynamically generated HTML
    window.openFileLocally = function(path) {
        fetch(API_BASE + '/api/open-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        })
        .then(res => res.json())
        .then(data => {
            if (!data.success) showToast("無法開啟檔案：" + data.message, "error");
        });
    };

    window.sendToCutter = function(path) {
        cutFilePath.value = path;
        // Reset times
        startH.value = 0; startM.value = 0; startS.value = 0;
        endH.value = 0; endM.value = 0; endS.value = 10;
        
        // Switch tab
        tabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        const cutTabBtn = Array.from(tabs).find(t => t.dataset.tab === 'tab-cut');
        cutTabBtn.classList.add('active');
        document.getElementById('tab-cut').classList.add('active');
        
        showToast("已載入剪輯檔案路徑！", "success");
    };

    window.sendToTranscribe = function(path) {
        transcribeFilePath.value = path;
        
        // Switch tab
        tabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        
        const transcribeTabBtn = Array.from(tabs).find(t => t.dataset.tab === 'tab-transcribe');
        transcribeTabBtn.classList.add('active');
        document.getElementById('tab-transcribe').classList.add('active');
        
        showToast("已載入語音辨識路徑！", "success");
    };

    window.deleteFileLocally = function(path, filename) {
        if (confirm(`確定要永久刪除此檔案嗎？\n檔名: ${filename}`)) {
            fetch(API_BASE + '/api/delete-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast("檔案已成功刪除！", "success");
                    loadFiles();
                } else {
                    showToast("刪除失敗：" + data.message, "error");
                }
            });
        }
    };

    /* ===================================================
       6. Toast Notification Helper
       =================================================== */

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `custom-toast toast-${type}`;
        
        let iconClass = 'fa-check-circle';
        if (type === 'warning') iconClass = 'fa-exclamation-circle';
        if (type === 'error') iconClass = 'fa-times-circle';
        
        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${message}</span>
        `;
        
        if (!document.getElementById('toast-style-tag')) {
            const style = document.createElement('style');
            style.id = 'toast-style-tag';
            style.innerHTML = `
                .custom-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: rgba(26, 22, 20, 0.95);
                    backdrop-filter: blur(8px);
                    border: 1px solid var(--border-color-active);
                    color: #fff;
                    padding: 14px 24px;
                    border-radius: 12px;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    transform: translateY(-20px);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .custom-toast.show {
                    transform: translateY(0);
                    opacity: 1;
                }
                .toast-success i { color: #8bc34a; }
                .toast-warning i { color: #ffb300; }
                .toast-error i { color: #ef5350; }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 50);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }
});
