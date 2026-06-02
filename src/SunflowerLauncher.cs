using System;
using System.Drawing;
using System.Windows.Forms;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Net.Sockets;

namespace SunflowerLauncher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherForm());
        }
    }

    public class LauncherForm : Form
    {
        private Label lblTitle;
        private Label lblStatus;
        private ProgressBar progressBar;
        private TextBox txtConsole;
        private NotifyIcon trayIcon;
        private ContextMenu trayMenu;

        private Process backendProcess;
        private Thread checkThread;
        private bool isServerRunning = false;
        private System.Windows.Forms.Timer portCheckTimer;
        private int checkCount = 0;

        // Win32 API to drag borderless window
        public const int WM_NCLBUTTONDOWN = 0xA1;
        public const int HT_CAPTION = 0x2;

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        public static extern int SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);
        [System.Runtime.InteropServices.DllImport("user32.dll")]
        public static extern bool ReleaseCapture();

        public LauncherForm()
        {
            LogDebug("LauncherForm Constructor Started");
            InitializeComponent();
            LogDebug("LauncherForm Constructor Completed");
        }

        private void LogDebug(string msg)
        {
            try
            {
                File.AppendAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "launcher_debug.log"), 
                    DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " - " + msg + Environment.NewLine);
            }
            catch { }
        }

        private void InitializeComponent()
        {
            this.SuspendLayout();

            // Form settings: Borderless, dark-themed
            this.Size = new Size(550, 350);
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(26, 22, 20);      // --bg-secondary: #1a1614
            this.ForeColor = Color.FromArgb(247, 245, 240);    // --text-primary: #f7f5f0
            this.Text = "向日葵本地伺服器啟動中 🌻";

            // Title Label
            lblTitle = new Label();
            lblTitle.Text = "YoutubeGrabber 🌻";
            lblTitle.Font = new Font("Microsoft JhengHei UI", 16, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(255, 179, 0); // --accent-sunflower: #ffb300
            lblTitle.Location = new Point(20, 20);
            lblTitle.Size = new Size(510, 30);
            lblTitle.MouseDown += DragForm_MouseDown;

            // Status Label
            lblStatus = new Label();
            lblStatus.Text = "正在初始化啟動器...";
            lblStatus.Font = new Font("Microsoft JhengHei UI", 10, FontStyle.Regular);
            lblStatus.Location = new Point(20, 55);
            lblStatus.Size = new Size(510, 25);
            lblStatus.MouseDown += DragForm_MouseDown;

            // Marquee Progress Bar
            progressBar = new ProgressBar();
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 30;
            progressBar.Location = new Point(20, 85);
            progressBar.Size = new Size(510, 10);

            // Styled console textbox (Dark Terminal)
            txtConsole = new TextBox();
            txtConsole.Multiline = true;
            txtConsole.ReadOnly = true;
            txtConsole.ScrollBars = ScrollBars.Vertical;
            txtConsole.BackColor = Color.FromArgb(13, 11, 10); // --terminal-bg: #0d0b0a
            txtConsole.ForeColor = Color.FromArgb(255, 204, 0); // --terminal-text: #ffcc00
            txtConsole.Font = new Font("Consolas", 9, FontStyle.Regular);
            txtConsole.Location = new Point(20, 105);
            txtConsole.Size = new Size(510, 225);
            txtConsole.BorderStyle = BorderStyle.None;

            // Add controls
            this.Controls.Add(lblTitle);
            this.Controls.Add(lblStatus);
            this.Controls.Add(progressBar);
            this.Controls.Add(txtConsole);

            // Create Tray Context Menu
            trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add("開啟向日葵網頁版", OnOpenWeb);
            trayMenu.MenuItems.Add("開啟程式資料夾", OnOpenFolder);
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add("結束並關閉伺服器", OnExit);

            // Create Tray Icon
            trayIcon = new NotifyIcon();
            trayIcon.Text = "向日葵本地伺服器運行中 🌻";
            trayIcon.ContextMenu = trayMenu;
            trayIcon.Visible = false;
            trayIcon.DoubleClick += OnOpenWeb;

            // Dynamically generate sunflower icon for the tray
            try
            {
                using (Bitmap bmp = new Bitmap(16, 16))
                {
                    using (Graphics g = Graphics.FromImage(bmp))
                    {
                        g.Clear(Color.Transparent);
                        g.FillEllipse(Brushes.Gold, 1, 1, 14, 14);
                        g.FillEllipse(Brushes.SaddleBrown, 4, 4, 8, 8);
                    }
                    trayIcon.Icon = Icon.FromHandle(bmp.GetHicon());
                }
            }
            catch (Exception ex)
            {
                LogDebug("Icon Generation Exception: " + ex.Message);
                trayIcon.Icon = SystemIcons.Application;
            }

            this.ResumeLayout(false);
            this.PerformLayout();

            // Set up form drag handlers
            this.MouseDown += DragForm_MouseDown;

            // Start check & launch thread sequence
            checkThread = new Thread(StartServiceSequence);
            checkThread.IsBackground = true;
            checkThread.Start();
            LogDebug("Background Thread checkThread Started");
        }

        private void DragForm_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                ReleaseCapture();
                SendMessage(Handle, WM_NCLBUTTONDOWN, HT_CAPTION, 0);
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            // Draw a subtle border around borderless splash screen
            using (Pen pen = new Pen(Color.FromArgb(255, 179, 0), 1))
            {
                e.Graphics.DrawRectangle(pen, 0, 0, this.Width - 1, this.Height - 1);
            }
        }

        private void StartServiceSequence()
        {
            LogDebug("StartServiceSequence Thread Running");
            UpdateStatus("正在檢查 Python 環境與依賴套件...", "Checking Python environment and dependencies...");

            bool envReady = CheckPythonEnvironment();
            LogDebug("CheckPythonEnvironment result: " + envReady);
            if (!envReady)
            {
                UpdateStatus("環境缺失或未就緒！即將為您開啟自動部署視窗...", "Environment check failed. Launching setup bat...");
                Thread.Sleep(2500);

                // Run installer bat in visible window, hide this splash, and close launcher
                this.Invoke((MethodInvoker)delegate {
                    LogDebug("Invoking setup bat and exiting");
                    this.Hide();
                    RunStartBatVisible();
                    Application.Exit();
                });
                return;
            }

            // Extract resources to temp path
            UpdateStatus("正在準備本機執行檔資源...", "Extracting launcher resources...");
            ExtractEmbeddedResources();

            UpdateStatus("環境檢測通過！正在啟動 Flask 後端伺服器...", "Environment OK. Starting Flask server...");
            LaunchBackendServer();
        }

        private bool CheckPythonEnvironment()
        {
            try
            {
                LogDebug("Executing python env check process");
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "python";
                psi.Arguments = "-c \"import flask, flask_cors, yt_dlp, faster_whisper, opencc\"";
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardError = true;
                psi.RedirectStandardOutput = true;

                using (Process proc = Process.Start(psi))
                {
                    proc.WaitForExit(10000);
                    LogDebug("Python check exit code: " + proc.ExitCode);
                    return proc.ExitCode == 0;
                }
            }
            catch (Exception ex)
            {
                LogDebug("CheckPythonEnvironment Exception: " + ex.Message + "\n" + ex.StackTrace);
                return false;
            }
        }

        private void RunStartBatVisible()
        {
            try
            {
                LogDebug("Running start.bat visibly");
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "cmd.exe";
                psi.Arguments = "/c start.bat";
                psi.WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory;
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                LogDebug("RunStartBatVisible Exception: " + ex.Message);
                MessageBox.Show("無法啟動 start.bat: " + ex.Message, "錯誤", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void LaunchBackendServer()
        {
            try
            {
                LogDebug("Launching Backend Server");
                string pythonScriptPath = Path.Combine(Path.GetTempPath(), "SunflowerWebStudio\\src\\main.py");
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "python";
                psi.Arguments = "\"" + pythonScriptPath + "\"";
                psi.WorkingDirectory = AppDomain.CurrentDomain.BaseDirectory;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;

                backendProcess = new Process();
                backendProcess.StartInfo = psi;
                backendProcess.EnableRaisingEvents = true;

                backendProcess.OutputDataReceived += (s, e) => {
                    if (e.Data != null) AppendConsoleLog(e.Data);
                };
                backendProcess.ErrorDataReceived += (s, e) => {
                    if (e.Data != null) AppendConsoleLog("[ERROR] " + e.Data);
                };

                backendProcess.Start();
                LogDebug("Backend Process Started. PID: " + backendProcess.Id);
                backendProcess.BeginOutputReadLine();
                backendProcess.BeginErrorReadLine();

                // Start port polling timer to wait for port 8000
                this.Invoke((MethodInvoker)delegate {
                    LogDebug("Starting Port Check Timer");
                    portCheckTimer = new System.Windows.Forms.Timer();
                    portCheckTimer.Interval = 1000;
                    portCheckTimer.Tick += PortCheckTimer_Tick;
                    portCheckTimer.Start();
                });
            }
            catch (Exception ex)
            {
                LogDebug("LaunchBackendServer Exception: " + ex.Message);
                AppendConsoleLog("[CRITICAL] 無法啟動 Flask 伺服器: " + ex.Message);
                UpdateStatus("啟動失敗！請檢查 Python 安裝與腳本位置。", "Failed to launch server.");
            }
        }

        private void PortCheckTimer_Tick(object sender, EventArgs e)
        {
            checkCount++;
            bool open = IsPortOpen("127.0.0.1", 8000);
            LogDebug("Port Check Tick #" + checkCount + " - Open: " + open);
            if (open)
            {
                portCheckTimer.Stop();
                isServerRunning = true;
                UpdateStatus("伺服器已就緒！正在開啟瀏覽器...", "Server ready! Opening browser...");

                // Open web browser
                try
                {
                    LogDebug("Opening Browser to github.io");
                    Process.Start("https://FirePhoenix1001.github.io/WedTest/");
                }
                catch (Exception ex)
                {
                    LogDebug("Browser Open Exception: " + ex.Message);
                    Process.Start("cmd", "/c start https://FirePhoenix1001.github.io/WedTest/");
                }

                Thread.Sleep(1000);

                // Hide splash window, show tray icon
                LogDebug("Hiding Splash Form, showing tray icon");
                this.Hide();
                trayIcon.Visible = true;
                trayIcon.ShowBalloonTip(3000, "YoutubeGrabber 向日葵", "本地伺服器啟動成功，已在背景運行中！🌻", ToolTipIcon.Info);
            }
            else if (checkCount > 20) // Timeout after 20 seconds
            {
                portCheckTimer.Stop();
                LogDebug("Port Check Timeout");
                AppendConsoleLog("[CRITICAL] 伺服器啟動超時，請檢查日誌輸出是否有報錯。");
                UpdateStatus("伺服器啟動超時！", "Startup timeout.");
                MessageBox.Show("後端伺服器啟動超時，請確認無其他程序佔用 Port 8000 且 Python 執行無誤。", "啟動超時", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private bool IsPortOpen(string host, int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var result = client.BeginConnect(host, port, null, null);
                    var success = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(500));
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        private void UpdateStatus(string zh, string en)
        {
            if (this.InvokeRequired)
            {
                this.Invoke((MethodInvoker)delegate { UpdateStatus(zh, en); });
                return;
            }
            lblStatus.Text = zh;
            AppendConsoleLog("[SYSTEM] " + en);
        }

        private void AppendConsoleLog(string text)
        {
            if (this.InvokeRequired)
            {
                this.Invoke((MethodInvoker)delegate { AppendConsoleLog(text); });
                return;
            }
            txtConsole.AppendText(text + Environment.NewLine);
        }

        private void OnOpenWeb(object sender, EventArgs e)
        {
            try { Process.Start("https://FirePhoenix1001.github.io/WedTest/"); }
            catch { Process.Start("cmd", "/c start https://FirePhoenix1001.github.io/WedTest/"); }
        }

        private void OnOpenFolder(object sender, EventArgs e)
        {
            try { Process.Start(AppDomain.CurrentDomain.BaseDirectory); }
            catch { }
        }

        private void OnExit(object sender, EventArgs e)
        {
            LogDebug("OnExit Triggered");
            CleanUpAndExit();
        }

        private void CleanUpAndExit()
        {
            LogDebug("CleanUpAndExit Started");
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }

            KillBackendProcess();
            LogDebug("CleanUpAndExit Completed, exiting Application");
            Application.Exit();
        }

        private void KillBackendProcess()
        {
            try
            {
                if (backendProcess != null && !backendProcess.HasExited)
                {
                    LogDebug("Killing Backend Process PID: " + backendProcess.Id);
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = "taskkill",
                        Arguments = "/f /t /pid " + backendProcess.Id,
                        CreateNoWindow = true,
                        UseShellExecute = false
                    }).WaitForExit(3000);
                    LogDebug("Backend Process Killed");
                }
            }
            catch (Exception ex)
            {
                LogDebug("KillBackendProcess Exception: " + ex.Message);
            }
        }

        private void ExtractEmbeddedResources()
        {
            try
            {
                string tempDir = Path.Combine(Path.GetTempPath(), "SunflowerWebStudio");
                string srcDir = Path.Combine(tempDir, "src");
                string staticDir = Path.Combine(srcDir, "static");

                if (!Directory.Exists(tempDir)) Directory.CreateDirectory(tempDir);
                if (!Directory.Exists(srcDir)) Directory.CreateDirectory(srcDir);
                if (!Directory.Exists(staticDir)) Directory.CreateDirectory(staticDir);

                LogDebug("Extracting resources to: " + tempDir);

                ExtractResource("main.py", Path.Combine(srcDir, "main.py"));
                ExtractResource("audioProcessor.py", Path.Combine(srcDir, "audioProcessor.py"));
                ExtractResource("mediaCut.py", Path.Combine(srcDir, "mediaCut.py"));
                ExtractResource("youtubeDownload.py", Path.Combine(srcDir, "youtubeDownload.py"));
                ExtractResource("static.index.html", Path.Combine(staticDir, "index.html"));
                ExtractResource("static.style.css", Path.Combine(staticDir, "style.css"));
                ExtractResource("static.app.js", Path.Combine(staticDir, "app.js"));
            }
            catch (Exception ex)
            {
                LogDebug("ExtractResources Exception: " + ex.Message);
            }
        }

        private void ExtractResource(string resourceName, string targetPath)
        {
            var assembly = System.Reflection.Assembly.GetExecutingAssembly();
            using (Stream stream = assembly.GetManifestResourceStream(resourceName))
            {
                if (stream == null)
                {
                    LogDebug("Resource not found: " + resourceName);
                    return;
                }
                using (FileStream fs = new FileStream(targetPath, FileMode.Create, FileAccess.Write))
                {
                    byte[] buffer = new byte[8192];
                    int bytesRead;
                    while ((bytesRead = stream.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        fs.Write(buffer, 0, bytesRead);
                    }
                }
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            LogDebug("OnFormClosing Triggered. Reason: " + e.CloseReason);
            if (e.CloseReason == CloseReason.UserClosing)
            {
                CleanUpAndExit();
            }
            base.OnFormClosing(e);
        }
    }
}
