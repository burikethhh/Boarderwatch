using System;
using System.Diagnostics;
using System.IO;
using System.Threading;

namespace BoardersWatch
{
    class Program
    {
        static Process server;
        const string URL = "http://localhost:3000";
        const string HEALTH = "http://localhost:3000/api/health";

        static void Main(string[] args)
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverDir = Path.Combine(exeDir, "server");
            string serverEntry = Path.Combine(serverDir, "src", "index.js");

            Console.Title = "BoardersWatch - Day N Earth Lucero Boarding House";
            Banner();

            if (!File.Exists(serverEntry))
            {
                Error("Cannot find the server files at:");
                Console.WriteLine("   " + serverEntry);
                Console.WriteLine();
                Console.WriteLine("Make sure BoardersWatch.exe is placed inside the 'Boarderwatch'");
                Console.WriteLine("folder (next to the 'server' and 'client' folders).");
                Pause();
                return;
            }

            string node = FindNode();
            if (node == null)
            {
                Error("Node.js was not found on this computer.");
                Console.WriteLine("Please install Node.js (LTS) from https://nodejs.org and try again.");
                Pause();
                return;
            }

            if (IsServerUp())
            {
                Console.WriteLine("[i] BoardersWatch is already running.");
                OpenBrowser();
                Console.WriteLine("    Opened " + URL);
                Pause();
                return;
            }

            Console.WriteLine("[1/3] Starting BoardersWatch server ...");
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = node;
            psi.Arguments = "src/index.js";
            psi.WorkingDirectory = serverDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.EnvironmentVariables["NODE_ENV"] = "production";
            if (string.IsNullOrEmpty(psi.EnvironmentVariables["JWT_SECRET"]))
                psi.EnvironmentVariables["JWT_SECRET"] = "boarderswatch_local_demo_secret_2026";
            if (string.IsNullOrEmpty(psi.EnvironmentVariables["PORT"]))
                psi.EnvironmentVariables["PORT"] = "3000";

            try
            {
                server = Process.Start(psi);
            }
            catch (Exception ex)
            {
                Error("Failed to start the server: " + ex.Message);
                Pause();
                return;
            }

            Console.WriteLine("[2/3] Waiting for the system to become ready ");
            bool ready = false;
            for (int i = 0; i < 90; i++)
            {
                Thread.Sleep(1000);
                if (server.HasExited)
                {
                    Console.WriteLine();
                    Error("The server stopped unexpectedly. Check the database / camera settings.");
                    Pause();
                    return;
                }
                if (IsServerUp()) { ready = true; break; }
                if (i % 2 == 0) Console.Write(".");
            }
            Console.WriteLine();

            if (!ready)
            {
                Error("The server did not respond in time.");
                Pause();
                StopServer();
                return;
            }

            Console.WriteLine("[3/3] Opening BoardersWatch in your browser ...");
            OpenBrowser();

            Console.WriteLine();
            Console.WriteLine("==============================================================");
            Console.WriteLine("  BOARDERSWATCH IS RUNNING");
            Console.WriteLine("--------------------------------------------------------------");
            Console.WriteLine("  URL     : " + URL);
            Console.WriteLine("  Login   : admin / admin123");
            Console.WriteLine("--------------------------------------------------------------");
            Console.WriteLine("  Add your camera in the 'CCTV Surveillance' page:");
            Console.WriteLine("    1. Click 'Add Camera'");
            Console.WriteLine("    2. Enter the camera IP, username and password");
            Console.WriteLine("    3. Click 'Save Camera', then 'Start Stream'");
            Console.WriteLine("==============================================================");
            Console.WriteLine();
            Console.WriteLine("  Keep this window OPEN while using the system.");
            Console.WriteLine("  Press ENTER to STOP the system and exit.");
            Console.WriteLine();

            Console.ReadLine();
            StopServer();
            Console.WriteLine("BoardersWatch stopped. Goodbye.");
        }

        static void Banner()
        {
            Console.WriteLine("==============================================================");
            Console.WriteLine("   BOARDERSWATCH");
            Console.WriteLine("   Web-Based Boarding House Management System");
            Console.WriteLine("   with Integrated CCTV Monitoring");
            Console.WriteLine("   Day N Earth Lucero Boarding House");
            Console.WriteLine("==============================================================");
            Console.WriteLine();
        }

        static void Error(string msg)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("[ERROR] " + msg);
            Console.ResetColor();
        }

        static void Pause()
        {
            Console.WriteLine();
            Console.WriteLine("Press ENTER to close this window ...");
            Console.ReadLine();
        }

        static bool IsServerUp()
        {
            try
            {
                using (var wc = new System.Net.WebClient())
                {
                    wc.Encoding = System.Text.Encoding.UTF8;
                    string r = wc.DownloadString(HEALTH);
                    return r != null && r.Contains("status");
                }
            }
            catch { return false; }
        }

        static void OpenBrowser()
        {
            try
            {
                Process.Start(new ProcessStartInfo(URL) { UseShellExecute = true });
            }
            catch { }
        }

        static string FindNode()
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] candidates = {
                Path.Combine(exeDir, "runtime", "node.exe"),
                Path.Combine(exeDir, "node.exe"),
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "nodejs", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
            };
            foreach (var c in candidates)
                if (File.Exists(c)) return c;

            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (var dir in path.Split(';'))
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(dir)) continue;
                    string f = Path.Combine(dir.Trim().Trim('"'), "node.exe");
                    if (File.Exists(f)) return f;
                }
                catch { }
            }
            return null;
        }

        static void StopServer()
        {
            try
            {
                if (server != null && !server.HasExited)
                {
                    server.Kill();
                    server.WaitForExit(3000);
                }
            }
            catch { }
        }
    }
}
