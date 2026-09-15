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

[assembly: AssemblyTitle("InvestAI Demo")]
[assembly: AssemblyProduct("InvestAI")]
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
            Log("INFO", "Shutdown request: process exit event received.");
            TryDelete(siteRoot);
        };

        try
        {
            siteRoot = Path.Combine(Path.GetTempPath(), "InvestAI-v0.6.2-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(siteRoot);
            ExtractSite(siteRoot);

            TcpListener listener = StartListener();
            int port = ((IPEndPoint)listener.LocalEndpoint).Port;
            Log("INFO", "Selected port: " + port + ".");
            string localUrl = "http://127.0.0.1:" + port + "/market";
            Thread serverThread = new Thread(new ThreadStart(delegate { RunServer(listener); }));
            serverThread.IsBackground = false;
            serverThread.Start();
            CheckHealth(localUrl);
            OpenBrowser(localUrl);
            ShowStartupMessage(localUrl);
            serverThread.Join();
        }
        catch (InvalidOperationException exception)
        {
            Log("ERROR", "Listener start failure. " + exception.ToString());
            MessageBox.Show(
                "InvestAI may already be running.\r\n\r\nTry opening:\r\nhttp://127.0.0.1:18460/market\r\n\r\nOr close existing InvestAI demo processes from Task Manager.",
                "InvestAI Demo",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
        }
        catch (Exception exception)
        {
            Log("FATAL", "Launcher stopped because of an exception. " + exception.ToString());
            MessageBox.Show(
                "InvestAI demo could not start.\r\n\r\n" + exception.Message,
                "InvestAI Demo",
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
                    ThreadPool.QueueUserWorkItem(delegate { HandleClient(client); });
                }
                catch (SocketException exception)
                {
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
            throw;
        }
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

    private static void CheckHealth(string localUrl)
    {
        try
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(localUrl);
            request.Method = "HEAD";
            request.Proxy = null;
            request.Timeout = ClientTimeoutMilliseconds;
            request.ReadWriteTimeout = ClientTimeoutMilliseconds;
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                Log("INFO", "Health check result: " + (int)response.StatusCode + " " + response.StatusDescription + ".");
            }
        }
        catch (Exception exception)
        {
            Log("ERROR", "Health check result: failure. " + exception.ToString());
        }
    }

    private static void ShowStartupMessage(string localUrl)
    {
        string loggingNotice = string.IsNullOrEmpty(loggingInitializationFailure)
            ? string.Empty
            : "\r\n\r\nLauncher logging is unavailable:\r\n" + loggingInitializationFailure;
        MessageBox.Show(
            "InvestAI demo is running.\r\n\r\nOpen:\r\n" + localUrl + "\r\n\r\nIf your browser did not open automatically, copy and paste the URL into your browser." + loggingNotice,
            "InvestAI Demo",
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
        throw new InvalidOperationException("InvestAI demo ports 18460-18463 are unavailable.");
    }

    private static void HandleClient(TcpClient client)
    {
        using (client)
        {
            try { Serve(client); }
            catch (IOException exception) { Log("WARN", "Client request I/O exception. " + exception.Message); }
            catch (SocketException exception) { Log("WARN", "Client request socket exception. " + exception.Message); }
            catch (ObjectDisposedException exception) { Log("WARN", "Client connection closed. " + exception.Message); }
            catch (InvalidOperationException exception) { Log("WARN", "Client request invalid operation. " + exception.Message); }
            catch (Exception exception) { Log("ERROR", "Client request exception. " + exception.ToString()); }
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
        if (resource == null) throw new InvalidOperationException("Embedded InvestAI application is missing.");
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

    private static void Serve(TcpClient client)
    {
        NetworkStream stream = client.GetStream();
        stream.ReadTimeout = ClientTimeoutMilliseconds;
        stream.WriteTimeout = ClientTimeoutMilliseconds;
        StreamReader reader = new StreamReader(stream, Encoding.ASCII, false, 4096, true);
        string request = reader.ReadLine();
        if (string.IsNullOrEmpty(request)) return;
        string[] parts = request.Split(' ');
        if (parts.Length < 2) return;
        string method = parts[0];
        string requestPath = Uri.UnescapeDataString(parts[1].Split('?')[0]).TrimStart('/');
        while (!string.IsNullOrEmpty(reader.ReadLine())) { }

        string relative = string.IsNullOrEmpty(requestPath) ? "index.html" : requestPath.Replace('/', Path.DirectorySeparatorChar);
        string filePath = Path.GetFullPath(Path.Combine(siteRoot, relative));
        if (!filePath.StartsWith(siteRoot, StringComparison.OrdinalIgnoreCase))
        {
            WriteStatus(stream, "403 Forbidden");
            return;
        }
        if (!File.Exists(filePath)) filePath = Path.Combine(siteRoot, "index.html");
        byte[] content = File.ReadAllBytes(filePath);
        string header = "HTTP/1.1 200 OK\r\nContent-Type: " + MimeType(filePath) + "\r\nContent-Length: " + content.Length + "\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n";
        byte[] headerBytes = Encoding.ASCII.GetBytes(header);
        stream.Write(headerBytes, 0, headerBytes.Length);
        if (!string.Equals(method, "HEAD", StringComparison.OrdinalIgnoreCase)) stream.Write(content, 0, content.Length);
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
