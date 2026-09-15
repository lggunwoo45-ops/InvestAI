using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Threading;

[assembly: AssemblyTitle("InvestAI Demo")]
[assembly: AssemblyProduct("InvestAI")]
[assembly: AssemblyCompany("InvestAI")]
[assembly: AssemblyVersion("0.6.2.0")]
[assembly: AssemblyFileVersion("0.6.2.0")]

internal static class Launcher
{
    private static readonly int[] Ports = { 18460, 18461, 18462, 18463 };
    private const int ClientTimeoutMilliseconds = 5000;
    private static string siteRoot = string.Empty;

    [STAThread]
    private static void Main()
    {
        siteRoot = Path.Combine(Path.GetTempPath(), "InvestAI-v0.6.2-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(siteRoot);
        ExtractSite(siteRoot);

        AppDomain.CurrentDomain.ProcessExit += delegate { TryDelete(siteRoot); };
        TcpListener listener = StartListener();
        int port = ((IPEndPoint)listener.LocalEndpoint).Port;
        Process.Start("http://127.0.0.1:" + port + "/market");

        while (true)
        {
            try
            {
                TcpClient client = listener.AcceptTcpClient();
                client.ReceiveTimeout = ClientTimeoutMilliseconds;
                client.SendTimeout = ClientTimeoutMilliseconds;
                ThreadPool.QueueUserWorkItem(delegate { HandleClient(client); });
            }
            catch (SocketException) { Thread.Sleep(100); }
            catch (ObjectDisposedException) { return; }
        }
    }

    private static TcpListener StartListener()
    {
        foreach (int port in Ports)
        {
            TcpListener listener = new TcpListener(IPAddress.Loopback, port);
            try
            {
                listener.Start();
                return listener;
            }
            catch (SocketException) { listener.Stop(); }
        }
        throw new InvalidOperationException("InvestAI demo ports 18460-18463 are unavailable.");
    }

    private static void HandleClient(TcpClient client)
    {
        using (client)
        {
            try { Serve(client); }
            catch (IOException) { }
            catch (SocketException) { }
            catch (ObjectDisposedException) { }
            catch (InvalidOperationException) { }
            catch (Exception) { }
        }
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
        catch { }
    }
}
