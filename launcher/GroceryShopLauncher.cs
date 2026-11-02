using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

/**
 * GroceryShop.exe - single click-to-run desktop launcher.
 *
 * Built with csc.exe (.NET Framework 4.x, runs on 4.8) /target:winexe so there
 * is never a black console window. The client double-clicks this and gets a
 * normal program window: backend + database + browser, all local.
 *
 *   1. Splash screen + single-instance mutex.
   2. Picks a free private loopback port for the backend.
   3. Starts the bundled portable MariaDB (app\mariadb, data\mysql).
   4. Starts the backend Java process hidden, polls /api/system/health.
   5. Opens Edge/Chrome in --app mode (dedicated user-data-dir): no address
      bar, no "localhost" typing, looks like an installed program.
   6. When the browser window closes, calls /api/system/stop and shuts
      MariaDB down cleanly.
   7. Logs to data\logs\shop.log. --verify runs the bootstrap without a
      browser for testing.
 */
internal static class GroceryShopLauncher
{
    private const string MutexName = "Local\\GroceryShop.SingleInstance.{4F1C2A90-8C3D-4E2B-9A7F-6D3E5C1B8A40}";
    private const string LogName = "shop.log";

    private static readonly string Root = Path.GetDirectoryName(
        Assembly.GetEntryAssembly().Location ?? Environment.CurrentDirectory);
    private static readonly string AppDir = Path.Combine(Root, "app");
    private static readonly string Jar = Path.Combine(AppDir, "backend-1.0.0.jar");
    private static readonly string JavaExe = Path.Combine(AppDir, "jre", "bin", "java.exe");
    private static readonly string DataDir = Path.Combine(Root, "data");
    private static readonly string MysqlDir = Path.Combine(DataDir, "mysql");
    private static readonly string MariaDbDir = Path.Combine(AppDir, "mariadb");
    private static readonly string MariaDbBin = Path.Combine(MariaDbDir, "bin");
    private static readonly string Mysqld = Path.Combine(MariaDbBin, "mysqld.exe");
    private static readonly string MysqlClient = Path.Combine(MariaDbBin, "mysql.exe");
    private static readonly string MyIni = Path.Combine(DataDir, "my.ini");
    private static readonly string LogDir = Path.Combine(DataDir, "logs");
    private static readonly string LogFile = Path.Combine(LogDir, LogName);
    private static readonly string BrowserProfile = Path.Combine(DataDir, "browser-profile");

    private static StringBuilder _log = new StringBuilder();
    private static Process _java;
    private static Process _mariadb;
    private static int _httpPort;
    private static int _httpsPort;
    private static string _controlToken;
    private static readonly HttpClient _http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };

    [STAThread]
    private static int Main(string[] args)
    {
        bool verify = args.Contains("--verify");
        bool noBrowser = args.Contains("--no-browser") || verify;
        int forcedPort = 0;
        foreach (var a in args)
        {
            if (a.StartsWith("--port="))
            {
                int p;
                if (int.TryParse(a.Substring("--port=".Length), out p)) forcedPort = p;
            }
        }

        Directory.CreateDirectory(LogDir);
        Log("===== GroceryShop starting =====");
        Log("Root: " + Root);

        // Single instance for the whole lifetime of the process.
        bool createdNew;
        using (var mutex = new Mutex(true, MutexName, out createdNew))
        {
            if (!createdNew)
            {
                Log("Another instance is already running.");
                MessageBox.Show("GroceryShop is already running.", "GroceryShop",
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
                return 0;
            }

            try
            {
                return RunInternal(verify, noBrowser, forcedPort);
            }
            catch (Exception ex)
            {
                Log("FATAL: " + ex);
                try
                {
                    MessageBox.Show("GroceryShop failed to start:\n" + ex.Message, "GroceryShop",
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                catch { }
                StopEverything();
                return 1;
            }
        }
    }

    private static int RunInternal(bool verify, bool noBrowser, int forcedPort)
    {
        using (var splash = Splash.Show("Starting GroceryShop...", "Preparing the shop"))
        {
            _controlToken = Guid.NewGuid().ToString("N");
            _httpPort = PickFreePort(forcedPort == 0 ? 8080 : forcedPort);
            _httpsPort = PickFreePort(_httpPort + 1);
            Log("HTTP port: " + _httpPort + "  HTTPS port: " + _httpsPort);

            bool mariadbBundled = Directory.Exists(MariaDbBin);
            if (mariadbBundled)
            {
                StartMariaDb(splash);
            }
            else
            {
                Log("WARNING: bundled MariaDB not found at " + MariaDbBin +
                    " - assuming an external database is already reachable on localhost:3306.");
            }

            if (!File.Exists(Jar))
                throw new FileNotFoundException("Backend jar not found: " + Jar);
            if (!File.Exists(JavaExe))
                throw new FileNotFoundException("Bundled JRE not found: " + JavaExe);

            splash.SetText("Starting backend...");
            StartJava();

            splash.SetText("Waiting for the shop to be ready...");
            var healthUrl = string.Format("http://127.0.0.1:{0}/api/system/health", _httpPort);
            if (!WaitForHealth(healthUrl, TimeSpan.FromSeconds(45)))
                throw new Exception("Backend did not become healthy on " + healthUrl);
            Log("Backend healthy.");

            if (noBrowser)
            {
                splash.Close();
                if (verify)
                {
                    Log("VERIFY: shop is running and healthy.");
                    StopEverything();
                    return 0;
                }
                return 0;
            }

            splash.Close();

            var browser = PickBrowser();
            if (browser == null)
                throw new Exception("Neither Microsoft Edge nor Google Chrome was found.");
            OpenAppWindow(browser);

            StopEverything();
            return 0;
        }
    }

    private static void OpenAppWindow(string browser)
    {
        var psi = new ProcessStartInfo
        {
            FileName = browser,
            Arguments = string.Format("--app=http://127.0.0.1:{0}/ --user-data-dir=\"{1}\" " +
                                      "--profile-directory=Default --no-first-run " +
                                      "--no-default-browser-check --disable-background-networking",
                                      _httpPort, BrowserProfile),
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        var browserProcess = Process.Start(psi);
        if (browserProcess == null) return;

        Log("Browser window opened: " + browser);
        browserProcess.WaitForExit();
        Log("Browser window closed.");
    }

    private static void StopEverything()
    {
        try
        {
            var stopUrl = string.Format("http://127.0.0.1:{0}/api/system/stop", _httpPort);
            var req = new HttpRequestMessage(HttpMethod.Post, stopUrl);
            req.Headers.Add("X-Control-Token", _controlToken);
            _http.SendAsync(req).Wait(TimeSpan.FromSeconds(5));
            Log("Backend stop requested.");
        }
        catch { /* best effort */ }

        if (_java != null)
        {
            try { _java.Kill(); }
            catch { }
        }
        if (_mariadb != null)
        {
            try { _mariadb.Kill(); }
            catch { }
        }
        Log("===== GroceryShop stopped =====");
        FlushLog();
    }

    // ------------------------------------------------------------------ ports

    private static int PickFreePort(int prefer)
    {
        for (int p = prefer; p < prefer + 200; p++)
            if (IsPortFree(p)) return p;
        throw new Exception("No free port near " + prefer);
    }

    private static bool IsPortFree(int port)
    {
        try
        {
            var listener = new TcpListener(IPAddress.Loopback, port);
            listener.Start();
            listener.Stop();
            return true;
        }
        catch { return false; }
    }

    // ------------------------------------------------------------------ mariadb

    private static void StartMariaDb(SplashForm splash)
    {
        splash.SetText("Starting database...");
        Log("Starting MariaDB from " + MariaDbDir);

        Directory.CreateDirectory(MysqlDir);

        var ini = new StringBuilder();
        ini.AppendLine("[client]");
        ini.AppendLine("port=3306");
        ini.AppendLine("default-character-set=utf8mb4");
        ini.AppendLine();
        ini.AppendLine("[mysqld]");
        ini.AppendLine("port=3306");
        ini.AppendLine("bind-address=127.0.0.1");
        ini.AppendLine("datadir=" + MysqlDir.Replace("\\", "/"));
        ini.AppendLine("log_error=" + Path.Combine(LogDir, "mariadb.log").Replace("\\", "/"));
        ini.AppendLine("pid_file=" + Path.Combine(MysqlDir, "mysqld.pid").Replace("\\", "/"));
        ini.AppendLine("socket=" + Path.Combine(MysqlDir, "mysql.sock").Replace("\\", "/"));
        ini.AppendLine("default-character-set=utf8mb4");
        ini.AppendLine("character-set-server=utf8mb4");
        ini.AppendLine("collation-server=utf8mb4_unicode_ci");
        ini.AppendLine("skip-networking=0");
        ini.AppendLine("innodb_flush_log_at_trx_commit=1");
        File.WriteAllText(MyIni, ini.ToString());

        if (!IsInitialized(MysqlDir))
        {
            Log("Initializing MariaDB data directory...");
            RunHidden(Mysqld, string.Format("--defaults-file=\"{0}\" --initialize-insecure --datadir=\"{1}\"",
                MyIni, MysqlDir), wait: true);
        }

        _mariadb = RunHidden(Mysqld, "--defaults-file=\"" + MyIni + "\"", wait: false);

        bool up = false;
        for (int i = 0; i < 60; i++)
        {
            if (!IsPortFree(3306) && TrySql("SELECT 1")) { up = true; break; }
            Thread.Sleep(500);
        }
        if (!up) throw new Exception("MariaDB did not become ready.");

        TrySql("ALTER USER 'root'@'localhost' IDENTIFIED BY 'Admin@123';");
        TrySql("CREATE DATABASE IF NOT EXISTS grocery_shop;");
        TrySql("FLUSH PRIVILEGES;");
        Log("MariaDB ready (grocery_shop).");
    }

    private static bool IsInitialized(string datadir)
    {
        var mysqlDir = Path.Combine(datadir, "mysql");
        if (!Directory.Exists(mysqlDir)) return false;
        return Directory.GetFiles(datadir, "*.ibd", SearchOption.AllDirectories).Length > 0 ||
               Directory.GetFiles(mysqlDir, "*", SearchOption.AllDirectories).Length > 5;
    }

    private static bool TrySql(string sql)
    {
        if (!File.Exists(MysqlClient)) return false;
        try
        {
            var p = RunHidden(MysqlClient, "-uroot -e \"" + EscapeSql(sql) + "\"",
                wait: true, hideWindow: true);
            return p.ExitCode == 0;
        }
        catch { return false; }
    }

    private static string EscapeSql(string sql)
    {
        return sql.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }

    // ------------------------------------------------------------------ java

    private static void StartJava()
    {
        var args = "-jar \"" + Jar + "\" " +
                   "--server.port=" + _httpPort + " " +
                   "--server.address=127.0.0.1 " +
                   "--app.https.port=" + _httpsPort + " " +
                   "--app.control-token=" + _controlToken;

        _java = RunHidden(JavaExe, args, wait: false);
        Task.Run(() => StreamReaderLog(_java.StandardOutput, "java: "));
        Task.Run(() => StreamReaderLog(_java.StandardError, "java ERR: "));
    }

    // ------------------------------------------------------------------ helpers

    private static Process RunHidden(string exe, string arguments, bool wait, bool hideWindow = true)
    {
        var psi = new ProcessStartInfo
        {
            FileName = exe,
            Arguments = arguments,
            UseShellExecute = false,
            CreateNoWindow = hideWindow,
            WindowStyle = hideWindow ? ProcessWindowStyle.Hidden : ProcessWindowStyle.Normal,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            WorkingDirectory = Root,
        };
        Log("RUN: " + Path.GetFileName(exe) + " " + arguments);
        var p = Process.Start(psi);
        if (wait) p.WaitForExit();
        return p;
    }

    private static async void StreamReaderLog(StreamReader reader, string prefix)
    {
        try
        {
            string line;
            while ((line = await reader.ReadLineAsync()) != null)
                Log(prefix + line);
        }
        catch { }
    }

    private static bool WaitForHealth(string url, TimeSpan timeout)
    {
        var end = DateTime.Now.Add(timeout);
        while (DateTime.Now < end)
        {
            try
            {
                using (var res = _http.GetAsync(url).Result)
                {
                    if (res.IsSuccessStatusCode) return true;
                }
            }
            catch { /* not up yet */ }
            Thread.Sleep(500);
        }
        return false;
    }

    private static string PickBrowser()
    {
        var candidates = new[]
        {
            @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            @"C:\Program Files\Google\Chrome\Application\chrome.exe",
            @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        };
        return candidates.FirstOrDefault(File.Exists);
    }

    private static void Log(string message)
    {
        var line = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] {1}", DateTime.Now, message);
        _log.AppendLine(line);
        FlushLog();
    }

    private static void FlushLog()
    {
        try { File.AppendAllText(LogFile, _log.ToString()); _log.Clear(); }
        catch { }
    }
}

// ------------------------------------------------------------------ splash (own STA thread + message loop)

internal static class Splash
{
    private static SplashForm _form;
    private static Thread _thread;
    private static ManualResetEvent _shown = new ManualResetEvent(false);

    public static SplashForm Show(string text, string title)
    {
        _shown.Reset();
        _thread = new Thread(delegate()
        {
            _form = new SplashForm(text, title);
            _shown.Set();
            Application.Run(_form);
        })
        { IsBackground = true, Name = "GroceryShop splash" };
        _thread.SetApartmentState(ApartmentState.STA);
        _thread.Start();
        _shown.WaitOne(TimeSpan.FromSeconds(5));
        return _form;
    }

    public static void SetText(string text)
    {
        if (_form != null && !_form.IsDisposed && _form.InvokeRequired)
            _form.Invoke(new Action(delegate() { _form.SetText(text); }));
        else if (_form != null)
            _form.SetText(text);
    }

    public static void Close()
    {
        if (_form != null && !_form.IsDisposed)
            _form.Invoke(new Action(delegate() { _form.Close(); }));
        if (_thread != null) _thread.Join(TimeSpan.FromSeconds(2));
    }
}

internal class SplashForm : Form
{
    private readonly Label _label;

    public SplashForm(string text, string title)
    {
        Text = title;
        Size = new Size(440, 190);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;
        MinimizeBox = false;
        BackColor = Color.White;

        var iconLabel = new Label
        {
            Text = "GroceryShop",
            Font = new Font("Segoe UI", 16, FontStyle.Bold),
            ForeColor = Color.FromArgb(34, 139, 34),
            Location = new Point(150, 18),
            Size = new Size(140, 28),
        };
        _label = new Label
        {
            Text = text,
            Location = new Point(20, 66),
            Size = new Size(400, 40),
        };
        var progress = new ProgressBar
        {
            Location = new Point(20, 124),
            Size = new Size(400, 16),
            Style = ProgressBarStyle.Marquee,
        };
        progress.MarqueeAnimationSpeed = 30;

        Controls.Add(iconLabel);
        Controls.Add(_label);
        Controls.Add(progress);
    }

    public void SetText(string text) { _label.Text = text; }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        base.OnFormClosing(e);
        Application.ExitThread();
    }
}
