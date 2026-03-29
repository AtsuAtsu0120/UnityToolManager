using UnityEngine;
using UnityEditor;
using System.Collections.Generic;

namespace Generators
{
  [FilePath("ProjectSettings/StatisticsMenuItemSettings.asset", FilePathAttribute.Location.ProjectFolder)]
  internal class StatisticsMenuItemSettings : ScriptableSingleton<StatisticsMenuItemSettings>
  {
      private const string SettingsPath = "Project/Tool Manager/StatisticsMenuItem";

      [SerializeField]
      private string gasUrl = "";

      [SerializeField]
      private string apiKey = "";

      internal string GasUrl => gasUrl;
      internal string ApiKey => apiKey;

      internal void SaveSettings()
      {
          Save(true);
      }

      [SettingsProvider]
      internal static SettingsProvider CreateSettingsProvider()
      {
          var provider = new SettingsProvider(SettingsPath, SettingsScope.Project)
          {
              label = "Statistics MenuItem",
              guiHandler = (_) =>
              {
                  var so = new SerializedObject(instance);
                  EditorGUILayout.PropertyField(so.FindProperty("gasUrl"), new GUIContent("GAS URL"));
                  EditorGUILayout.PropertyField(so.FindProperty("apiKey"), new GUIContent("API Key"));
                  if (so.ApplyModifiedProperties())
                  {
                      instance.SaveSettings();
                  }
              },
              keywords = new HashSet<string>(new[] { "Statistics", "GAS", "URL", "MenuItem" })
          };
          return provider;
      }
  }
}
