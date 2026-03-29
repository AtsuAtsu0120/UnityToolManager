using UnityEditor;
using UnityEngine;
using UnityEngine.Networking;

namespace Generators                                                                                                                                                                                   
{                                                                          
  public static class StatisticsMenuItemHelper
  {
      public static void SendStatistics(string methodName)
      {
          var settings = StatisticsMenuItemSettings.instance;
          if (settings == null || string.IsNullOrEmpty(settings.GasUrl))
          {
              Debug.LogWarning("[StatisticsMenuItem] GAS URL is not configured. Set it in Edit > Project Settings > Tool Manager > StatisticsMenuItem.");
              return;
          }

          if (!settings.GasUrl.StartsWith("https://script.google.com/macros/"))
          {
              Debug.LogWarning($"[StatisticsMenuItem] GAS URL format may be incorrect: {settings.GasUrl}\nExpected: https://script.google.com/macros/s/DEPLOY_ID/exec");
              return;
          }

          var userName = CloudProjectSettings.userName ?? "";
          var json = $"{{\"methodName\": \"{methodName}\", \"dateTime\": \"{System.DateTime.Now:o}\", \"apiKey\": \"{settings.ApiKey}\", \"userName\": \"{userName}\"}}";
          var bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);

          var request = new UnityWebRequest(settings.GasUrl, "POST");
          request.uploadHandler = new UploadHandlerRaw(bodyRaw);
          request.downloadHandler = new DownloadHandlerBuffer();
          request.SetRequestHeader("Content-Type", "application/json");

          var op = request.SendWebRequest();
          op.completed += _ =>
          {
              if (request.result == UnityWebRequest.Result.Success)
              {
                  Debug.Log($"[StatisticsMenuItem] Statistics sent: {methodName}");
              }
              else
              {
                  var body = request.downloadHandler?.text ?? "";
                  Debug.LogWarning($"[StatisticsMenuItem] Failed to send statistics.\n" +
                      $"  Method: {methodName}\n" +
                      $"  URL: {settings.GasUrl}\n" +
                      $"  Error: {request.error}\n" +
                      $"  Response Code: {request.responseCode}\n" +
                      (string.IsNullOrEmpty(body) ? "" : $"  Response Body: {body}\n"));
              }
              request.Dispose();
          };
      }
  }                                                                                                                                                                                                  
}     