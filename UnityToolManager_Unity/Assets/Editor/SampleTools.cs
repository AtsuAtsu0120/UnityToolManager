using UnityEngine;
using UnityToolManager;

namespace Editor
{
    public static partial class SampleTools
    {
        [StatisticsMenuItem("Tools/Sample/Hello")]
        static void Hello()
        {
            Debug.Log("Hello from SampleTools!");
        }

        [StatisticsMenuItem("Tools/Sample/DoSomething")]
        static void DoSomething()
        {
            Debug.Log("DoSomething executed!");
        }
    }
}
