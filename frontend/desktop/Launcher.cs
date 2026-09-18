using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Market Copilot Demo")]
[assembly: AssemblyProduct("Market Copilot")]
[assembly: AssemblyCompany("InvestAI")]
[assembly: AssemblyVersion("0.6.2.0")]
[assembly: AssemblyFileVersion("0.6.2.0")]

internal static class Launcher
{
    private static readonly int[] Ports = { 18460, 18461, 18462, 18463 };
    private const int ClientTimeoutMilliseconds = 5000;
    private static readonly object LogSync = new object();
    private static string siteRoot = string.Empty;
    private static string logPath = string.Empty;
    private static string loggingInitializationFailure = string.Empty;
    private static string processExitReason = "Launcher completed.";
    private static int shutdownRequested;

    [STAThread]
    private static void Main()
    {
        InitializeLogging();
        Log("INFO", "Process start. Version 0.6.2.0.");
        AppDomain.CurrentDomain.UnhandledException += delegate(object sender, UnhandledExceptionEventArgs args)
        {
            Exception exception = args.ExceptionObject as Exception;
            Log("FATAL", "Unhandled exception. " + (exception == null ? args.ExceptionObject.ToString() : exception.ToString()));
        };
        AppDomain.CurrentDomain.ProcessExit += delegate
        {
            Log("INFO", "Process exit reason: " + processExitReason);
            TryDelete(siteRoot);
        };

        try
        {
            TcpListener listener = null;
            string existingUrl = null;
            using (Mutex startupMutex = new Mutex(false, @"Local\InvestAI.v0.6.2.Launcher"))
            {
                bool lockTaken = false;
                try
                {
                    try { lockTaken = startupMutex.WaitOne(TimeSpan.FromSeconds(15)); }
                    catch (AbandonedMutexException) { lockTaken = true; }
                    if (!lockTaken) throw new InvalidOperationException("Market Copilot startup is busy. Please try again.");

                    existingUrl = FindExistingInstance();
                    if (existingUrl == null)
                    {
                        siteRoot = Path.Combine(Path.GetTempPath(), "InvestAI-v0.6.2-" + Guid.NewGuid().ToString("N"));
                        Directory.CreateDirectory(siteRoot);
                        ExtractSite(siteRoot);
                        listener = StartListener();
                    }
                }
                finally
                {
                    if (lockTaken) startupMutex.ReleaseMutex();
                }
            }

            if (existingUrl != null)
            {
                Log("INFO", "Duplicate instance detected at " + existingUrl + ".");
                OpenBrowser(existingUrl);
                MessageBox.Show("Market Copilot is already running at:\r\n" + existingUrl,
                    "Market Copilot Demo", MessageBoxButtons.OK, MessageBoxIcon.Information);
                processExitReason = "New launcher exiting after opening existing instance.";
                Log("INFO", processExitReason);
                return;
            }

            int port = ((IPEndPoint)listener.LocalEndpoint).Port;
            Log("INFO", "Selected port: " + port + ".");
            if (port != Ports[0]) Log("WARN", "Fallback port " + port + " selected because default port 18460 is occupied by a non-InvestAI service.");
            string localUrl = "http://127.0.0.1:" + port + "/market";
            Thread serverThread = new Thread(new ThreadStart(delegate { RunServer(listener); }));
            serverThread.IsBackground = false;
            serverThread.Start();
            CheckHealth("http://127.0.0.1:" + port + "/health");
            OpenBrowser(localUrl);
            // Keep the visible startup notice from blocking a later /shutdown.
            Thread noticeThread = new Thread(new ThreadStart(delegate
            {
                try { ShowStartupMessage(localUrl, port); }
                catch (Exception exception) { Log("ERROR", "Startup notice failure. " + exception.ToString()); }
            }));
            noticeThread.IsBackground = true;
            noticeThread.SetApartmentState(ApartmentState.STA);
            noticeThread.Start();
            serverThread.Join();
            processExitReason = Volatile.Read(ref shutdownRequested) == 1
                ? "Shutdown endpoint requested; listener stopped cleanly."
                : "Server thread stopped unexpectedly.";
        }
        catch (InvalidOperationException exception)
        {
            processExitReason = "Launcher startup failed: " + exception.Message;
            Log("ERROR", processExitReason + " " + exception.ToString());
            string message = exception.Message == "Ports 18460-18463 are unavailable."
                ? "Market Copilot could not start because ports 18460–18463 are already in use.\r\n\r\nTry:\r\n1. Close existing InvestAI_v0.6.2_demo.exe processes from Task Manager.\r\n2. Or restart Windows.\r\n3. Then start Market Copilot again."
                : "Market Copilot demo could not start.\r\n\r\n" + exception.Message;
            MessageBox.Show(message, "Market Copilot Demo", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        catch (Exception exception)
        {
            processExitReason = "Launcher stopped unexpectedly: " + exception.Message;
            Log("FATAL", "Launcher stopped because of an exception. " + exception.ToString());
            MessageBox.Show(
                "Market Copilot demo could not start.\r\n\r\n" + exception.Message,
                "Market Copilot Demo",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    private static void RunServer(TcpListener listener)
    {
        try
        {
            while (true)
            {
                try
                {
                    TcpClient client = listener.AcceptTcpClient();
                    client.ReceiveTimeout = ClientTimeoutMilliseconds;
                    client.SendTimeout = ClientTimeoutMilliseconds;
                    ThreadPool.QueueUserWorkItem(delegate { HandleClient(client, listener); });
                }
                catch (SocketException exception)
                {
                    if (Volatile.Read(ref shutdownRequested) == 1) return;
                    Log("WARN", "Listener socket exception; continuing. " + exception.Message);
                    Thread.Sleep(100);
                }
                catch (ObjectDisposedException exception)
                {
                    Log("INFO", "Shutdown request: listener closed. " + exception.Message);
                    return;
                }
            }
        }
        catch (Exception exception)
        {
            Log("FATAL", "Server thread exited unexpectedly. " + exception.ToString());
        }
        finally
        {
            Log("INFO", "Listener stopped.");
        }
    }

    private static string FindExistingInstance()
    {
        foreach (int port in Ports)
        {
            string healthUrl = "http://127.0.0.1:" + port + "/health";
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(healthUrl);
                request.Method = "GET";
                request.Proxy = null;
                request.Timeout = 1200;
                request.ReadWriteTimeout = 1200;
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                using (StreamReader reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
                {
                    string body = reader.ReadToEnd();
                    bool isInvestAI = response.StatusCode == HttpStatusCode.OK && body == "InvestAI Demo OK";
                    Log("INFO", "Existing instance scan on port " + port + ": " + (isInvestAI ? "InvestAI found" : "other service") + ".");
                    if (isInvestAI) return "http://127.0.0.1:" + port + "/market";
                }
            }
            catch (Exception exception)
            {
                Log("INFO", "Existing instance scan on port " + port + ": no InvestAI endpoint (" + exception.Message + ").");
            }
        }
        return null;
    }

    private static void OpenBrowser(string localUrl)
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = localUrl,
                UseShellExecute = true
            });
            Log("INFO", "Browser launch success: " + localUrl);
        }
        catch (Exception exception)
        {
            Log("ERROR", "Browser launch failure: " + exception.ToString());
        }
    }

    private static void CheckHealth(string healthUrl)
    {
        try
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(healthUrl);
            request.Method = "GET";
            request.Proxy = null;
            request.Timeout = ClientTimeoutMilliseconds;
            request.ReadWriteTimeout = ClientTimeoutMilliseconds;
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            using (StreamReader reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
            {
                string body = reader.ReadToEnd();
                Log(body == "InvestAI Demo OK" ? "INFO" : "ERROR", "Health check result: " + (int)response.StatusCode + " " + body + ".");
            }
        }
        catch (Exception exception)
        {
            Log("ERROR", "Health check result: failure. " + exception.ToString());
        }
    }

    private static void ShowStartupMessage(string localUrl, int port)
    {
        string loggingNotice = string.IsNullOrEmpty(loggingInitializationFailure)
            ? string.Empty
            : "\r\n\r\nLauncher logging is unavailable:\r\n" + loggingInitializationFailure;
        string fallbackNotice = port == Ports[0] ? string.Empty
            : "\r\n\r\nMarket Copilot started on fallback port " + port + ".\r\nWatchlist data may be separate from the default 18460 storage.";
        MessageBox.Show(
            "Market Copilot demo is running.\r\n\r\nOpen:\r\n" + localUrl + "\r\n\r\nIf your browser did not open automatically, copy and paste the URL into your browser." + fallbackNotice + loggingNotice,
            "Market Copilot Demo",
            MessageBoxButtons.OK,
            MessageBoxIcon.Information);
    }

    private static TcpListener StartListener()
    {
        foreach (int port in Ports)
        {
            TcpListener listener = new TcpListener(IPAddress.Loopback, port);
            try
            {
                listener.Start();
                Log("INFO", "Listener start success on 127.0.0.1:" + port + ".");
                return listener;
            }
            catch (SocketException exception)
            {
                Log("WARN", "Listener start failure on 127.0.0.1:" + port + ". " + exception.Message);
                listener.Stop();
            }
        }
        throw new InvalidOperationException("Ports 18460-18463 are unavailable.");
    }

    private static void HandleClient(TcpClient client, TcpListener listener)
    {
        bool shouldShutdown = false;
        using (client)
        {
            try { shouldShutdown = Serve(client); }
            catch (IOException exception) { Log("WARN", "Client request I/O exception. " + exception.Message); }
            catch (SocketException exception) { Log("WARN", "Client request socket exception. " + exception.Message); }
            catch (ObjectDisposedException exception) { Log("WARN", "Client connection closed. " + exception.Message); }
            catch (InvalidOperationException exception) { Log("WARN", "Client request invalid operation. " + exception.Message); }
            catch (Exception exception) { Log("ERROR", "Client request exception. " + exception.ToString()); }
        }
        if (shouldShutdown && Interlocked.Exchange(ref shutdownRequested, 1) == 0)
        {
            Log("INFO", "Shutdown request received; stopping listener.");
            listener.Stop();
        }
    }

    private static void InitializeLogging()
    {
        try
        {
            string logDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "InvestAI");
            Directory.CreateDirectory(logDirectory);
            logPath = Path.Combine(logDirectory, "demo-launcher.log");
        }
        catch (Exception exception)
        {
            loggingInitializationFailure = exception.Message;
        }
    }

    private static void Log(string level, string message)
    {
        if (string.IsNullOrEmpty(logPath)) return;
        try
        {
            string line = DateTimeOffset.Now.ToString("o") + " [PID " + Process.GetCurrentProcess().Id + "] [" + level + "] " + message + Environment.NewLine;
            lock (LogSync)
            {
                File.AppendAllText(logPath, line, Encoding.UTF8);
            }
        }
        catch { }
    }

    private static void ExtractSite(string destination)
    {
        Stream resource = Assembly.GetExecutingAssembly().GetManifestResourceStream("InvestAI.Site");
        if (resource == null) throw new InvalidOperationException("Embedded Market Copilot application is missing.");
        using (resource)
        using (ZipArchive archive = new ZipArchive(resource, ZipArchiveMode.Read))
        {
            foreach (ZipArchiveEntry entry in archive.Entries)
            {
                string target = Path.GetFullPath(Path.Combine(destination, entry.FullName));
                if (!target.StartsWith(destination, StringComparison.OrdinalIgnoreCase)) continue;
                if (string.IsNullOrEmpty(entry.Name))
                {
                    Directory.CreateDirectory(target);
                    continue;
                }
                Directory.CreateDirectory(Path.GetDirectoryName(target));
                entry.ExtractToFile(target, true);
            }
        }
    }

    private static bool Serve(TcpClient client)
    {
        NetworkStream stream = client.GetStream();
        stream.ReadTimeout = ClientTimeoutMilliseconds;
        stream.WriteTimeout = ClientTimeoutMilliseconds;
        StreamReader reader = new StreamReader(stream, Encoding.ASCII, false, 4096, true);
        string request = reader.ReadLine();
        if (string.IsNullOrEmpty(request)) return false;
        string[] parts = request.Split(' ');
        if (parts.Length < 2) return false;
        string method = parts[0];
        string requestPath = Uri.UnescapeDataString(parts[1].Split('?')[0]).TrimStart('/');
        while (!string.IsNullOrEmpty(reader.ReadLine())) { }

        if (string.Equals(requestPath, "health", StringComparison.OrdinalIgnoreCase))
        {
            Log("INFO", "/health request received.");
            WriteText(stream, "InvestAI Demo OK", method);
            return false;
        }
        if (string.Equals(requestPath, "shutdown", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.Equals(method, "GET", StringComparison.OrdinalIgnoreCase))
            {
                WriteStatus(stream, "405 Method Not Allowed");
                return false;
            }
            Log("INFO", "/shutdown request received.");
            WriteText(stream, "InvestAI demo is shutting down.", method);
            return true;
        }

        string relative = string.IsNullOrEmpty(requestPath) ? "index.html" : requestPath.Replace('/', Path.DirectorySeparatorChar);
        string filePath = Path.GetFullPath(Path.Combine(siteRoot, relative));
        if (!filePath.StartsWith(siteRoot, StringComparison.OrdinalIgnoreCase))
        {
            WriteStatus(stream, "403 Forbidden");
            return false;
        }
        if (!File.Exists(filePath)) filePath = Path.Combine(siteRoot, "index.html");
        byte[] content = File.ReadAllBytes(filePath);
        string header = "HTTP/1.1 200 OK\r\nContent-Type: " + MimeType(filePath) + "\r\nContent-Length: " + content.Length + "\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n";
        byte[] headerBytes = Encoding.ASCII.GetBytes(header);
        stream.Write(headerBytes, 0, headerBytes.Length);
        if (!string.Equals(method, "HEAD", StringComparison.OrdinalIgnoreCase)) stream.Write(content, 0, content.Length);
        return false;
    }

    private static void WriteText(Stream stream, string content, string method)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(content);
        byte[] header = Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: " + bytes.Length + "\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n");
        stream.Write(header, 0, header.Length);
        if (!string.Equals(method, "HEAD", StringComparison.OrdinalIgnoreCase)) stream.Write(bytes, 0, bytes.Length);
        stream.Flush();
    }

    private static void WriteStatus(Stream stream, string status)
    {
        byte[] response = Encoding.ASCII.GetBytes("HTTP/1.1 " + status + "\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
        stream.Write(response, 0, response.Length);
    }

    private static string MimeType(string path)
    {
        switch (Path.GetExtension(path).ToLowerInvariant())
        {
            case ".html": return "text/html; charset=utf-8";
            case ".js": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".ico": return "image/x-icon";
            case ".json": return "application/json";
            default: return "application/octet-stream";
        }
    }

    private static void TryDelete(string path)
    {
        try { if (Directory.Exists(path)) Directory.Delete(path, true); }
        catch (Exception exception) { Log("WARN", "Temporary site cleanup failure. " + exception.Message); }
    }
}
