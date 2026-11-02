using System;
using System.Collections;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
// Test double for setup-disposable.regression.ps1. Reaches no engine. Its scenario file sits next to
// the executable because the setup script filters the environment. A call that does not carry the
// pinned --host stands for the daemon selected by a poisoned context or config.
public static class FakeDocker {
  const string Pinned = "npipe:////./pipe/docker_engine";
  public static int Main(string[] a) {
    string dir = AppDomain.CurrentDomain.BaseDirectory;
    string scenario = File.ReadAllText(Path.Combine(dir, "scenario.txt")).Trim();
    if (scenario == "idle-sentinel") { Thread.Sleep(600000); return 0; }
    string[] names = Environment.GetEnvironmentVariables().Cast<DictionaryEntry>()
      .Select(e => (string)e.Key).OrderBy(n => n, StringComparer.OrdinalIgnoreCase).ToArray();
    File.AppendAllText(Path.Combine(dir, "calls.log"),
      Process.GetCurrentProcess().Id + "\u001e" + string.Join("\u001f", a) + "\u001e" +
      string.Join(",", names) + "\u001e" + Environment.GetEnvironmentVariable("DOCKER_CONFIG") + "\n");
    string password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD");
    if (password != null) File.AppendAllText(Path.Combine(dir, "secrets.log"), password + "\n");
    bool pinned = a.Length >= 2 && a[0] == "--host" && a[1] == Pinned;
    string call = string.Join(" ", pinned ? a.Skip(2) : a);
    string hex = new string('e', 64);
    if (scenario == "timeout:" + Verb(call)) { Thread.Sleep(600000); return 0; }
    if (scenario == "fail:" + Verb(call)) {
      Console.Error.WriteLine("simulated failure");
      return 125;
    }
    if (call.StartsWith("info")) {
      string name = !pinned || scenario == "wrong-engine" ? "remote-daemon" : "docker-desktop";
      string context = scenario == "wrong-context" ? "remote" : "default";
      Console.WriteLine("{\"ID\":\"fake\",\"Name\":\"" + name + "\",\"OSType\":\"linux\"," +
        "\"OperatingSystem\":\"Docker Desktop\",\"ServerErrors\":null," +
        "\"ClientInfo\":{\"Context\":\"" + context + "\"}}");
      return 0;
    }
    if (call.StartsWith("exec -i")) {
      string sql = Console.In.ReadToEnd();
      Match m = Regex.Match(sql, "PASSWORD '([a-f0-9]+)'");
      if (m.Success) File.AppendAllText(Path.Combine(dir, "secrets.log"), m.Groups[1].Value + "\n");
      return 0;
    }
    if (call.StartsWith("exec")) return 0;
    if (call.Contains(".Internal")) { Console.WriteLine("false"); return 0; }
    if (call.Contains(".NetworkSettings.Ports")) {
      Match port = Regex.Match(File.ReadAllText(Path.Combine(dir, "calls.log")), "127\\.0\\.0\\.1:(\\d+):5432");
      Console.WriteLine("{\"5432/tcp\":[{\"HostIp\":\"127.0.0.1\",\"HostPort\":\"" + port.Groups[1].Value + "\"}]}");
      return 0;
    }
    if (call.Contains("Labels")) {
      Console.WriteLine("{\"com.drphynex.migration-guard-test\":\"disposable-v1\"}");
      return 0;
    }
    if (call.StartsWith("volume create")) { Console.WriteLine(a[a.Length - 1]); return 0; }
    Console.WriteLine(hex);
    return 0;
  }
  static string Verb(string call) {
    if (call.StartsWith("info")) return "info";
    if (call.StartsWith("network create")) return "network";
    if (call.StartsWith("volume create")) return "volume";
    if (call.StartsWith("run")) return "run";
    if (call.StartsWith("exec -i")) return "bootstrap";
    return "other";
  }
}
