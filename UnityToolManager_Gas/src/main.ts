/**
 * UnityToolManager - Google Apps Script
 *
 * Unityエディタのツール使用統計をスプレッドシートに記録するWebアプリ。
 *
 * セットアップ手順:
 * 1. このスクリプトをGoogleスプレッドシートにバインド（拡張機能 > Apps Script）
 *    または、スクリプトプロパティ SPREADSHEET_ID にスプレッドシートIDを設定
 * 2. スクリプトプロパティに API_KEY を設定
 *    （GASエディタ: プロジェクトの設定 > スクリプトプロパティ）
 * 3. initializeSheet() を一度実行してヘッダー行を作成
 * 4. Webアプリとしてデプロイ（実行者: 自分、アクセス: 全員）
 * 5. デプロイURLをUnityのProject Settings > Statistics MenuItemに設定
 */

const DATA_SHEET_NAME = "記録データ";
const STATISTICS_SHEET_NAME = "統計";

/**
 * POSTリクエストを受け取り、スプレッドシートに記録する
 */
function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { methodName, dateTime, apiKey, userName } = payload;

    if (!methodName || !dateTime || !apiKey) {
      return createJsonResponse({ status: "error", message: "Missing required fields" }, 400);
    }

    if (!validateApiKey(apiKey)) {
      return createJsonResponse({ status: "error", message: "Invalid API key" }, 403);
    }

    appendToSheet(methodName, dateTime, userName || "");

    return createJsonResponse({ status: "ok", message: "Recorded successfully" }, 200);
  } catch (error) {
    return createJsonResponse({ status: "error", message: String(error) }, 500);
  }
}

/**
 * GETリクエスト（動作確認用）
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  return createJsonResponse({ status: "ok", message: "UnityToolManager GAS is running" }, 200);
}

/**
 * APIキーを検証する
 */
function validateApiKey(apiKey: string): boolean {
  const storedKey = PropertiesService.getScriptProperties().getProperty("API_KEY");
  if (!storedKey) {
    Logger.log("WARNING: API_KEY is not set in script properties");
    return false;
  }
  return apiKey === storedKey;
}

/**
 * スプレッドシートにデータを追記する
 */
function appendToSheet(methodName: string, dateTime: string, userName: string): void {
  const sheet = getTargetSheet();
  const serverTime = new Date();
  sheet.appendRow([dateTime, userName, methodName, serverTime]);
}

/**
 * スプレッドシートを取得する（存在しなければ新規作成）
 */
function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty("SPREADSHEET_ID");

  if (!spreadsheetId) {
    const ss = SpreadsheetApp.create("UnityToolManager Statistics");
    spreadsheetId = ss.getId();
    props.setProperty("SPREADSHEET_ID", spreadsheetId);
    Logger.log("スプレッドシートを新規作成しました: " + ss.getUrl());
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

/**
 * 書き込み先のデータシートを取得する
 */
function getTargetSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(DATA_SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(DATA_SHEET_NAME);
  }
  return sheet;
}

/**
 * 統計シートを取得する（存在しなければ作成）
 */
function getStatisticsSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const ss = getSpreadsheet();
  let statsSheet = ss.getSheetByName(STATISTICS_SHEET_NAME);
  if (!statsSheet) {
    statsSheet = ss.insertSheet(STATISTICS_SHEET_NAME, 1);
  }
  return statsSheet;
}

/**
 * JSONレスポンスを生成する
 */
function createJsonResponse(body: object, statusCode: number): GoogleAppsScript.Content.TextOutput {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 統計シートを更新する
 * トリガーまたは手動で実行してください。
 */
function updateStatistics(): void {
  const dataSheet = getTargetSheet();
  const statsSheet = getStatisticsSheet();

  const lastRow = dataSheet.getLastRow();
  if (lastRow <= 1) {
    statsSheet.clear();
    statsSheet.getRange("A1:E1").setValues([["メソッド名", "直近1日", "直近1週間", "直近1ヶ月", "全期間"]]);
    statsSheet.getRange("A1:E1").setFontWeight("bold");
    statsSheet.setFrozenRows(1);
    return;
  }

  const data = dataSheet.getRange(2, 1, lastRow - 1, 4).getValues();

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const stats = new Map<string, { day: number; week: number; month: number; total: number }>();

  for (const row of data) {
    const methodName = String(row[2]);
    const timestamp = row[3];

    if (!methodName) continue;

    if (!stats.has(methodName)) {
      stats.set(methodName, { day: 0, week: 0, month: 0, total: 0 });
    }
    const entry = stats.get(methodName)!;
    entry.total++;

    const ts = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (ts >= oneDayAgo) entry.day++;
    if (ts >= oneWeekAgo) entry.week++;
    if (ts >= oneMonthAgo) entry.month++;
  }

  const sortedNames = Array.from(stats.keys()).sort();

  const header: (string | number)[] = ["メソッド名", "直近1日", "直近1週間", "直近1ヶ月", "全期間"];
  const rows: (string | number)[][] = sortedNames.map(name => {
    const s = stats.get(name)!;
    return [name, s.day, s.week, s.month, s.total];
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc[1] = (acc[1] as number) + (row[1] as number);
      acc[2] = (acc[2] as number) + (row[2] as number);
      acc[3] = (acc[3] as number) + (row[3] as number);
      acc[4] = (acc[4] as number) + (row[4] as number);
      return acc;
    },
    ["合計", 0, 0, 0, 0] as (string | number)[]
  );
  rows.push(totals);

  statsSheet.clear();
  const allRows = [header, ...rows];
  statsSheet.getRange(1, 1, allRows.length, 5).setValues(allRows);

  statsSheet.getRange("A1:E1").setFontWeight("bold");
  statsSheet.setFrozenRows(1);
  const totalsRowNum = allRows.length;
  statsSheet.getRange(totalsRowNum, 1, 1, 5).setFontWeight("bold");

  for (let col = 1; col <= 5; col++) {
    statsSheet.autoResizeColumn(col);
  }

  statsSheet.getRange(totalsRowNum + 2, 1).setValue(
    "最終更新: " + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss")
  );

  Logger.log("統計シートを更新しました");
}

/**
 * 統計シートの自動更新トリガーを設定する（1時間ごと）
 * GASエディタから手動で一度実行してください。
 */
function installStatisticsTrigger(): void {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "updateStatistics") {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger("updateStatistics")
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log("統計更新トリガーを設定しました（1時間ごと）");
}

/**
 * 初期セットアップ: ヘッダー行を追加する
 * GASエディタから手動で一度実行してください。
 */
function initializeSheet(): void {
  const sheet = getTargetSheet();

  // ヘッダーが既にある場合はスキップ
  const firstCell = sheet.getRange("A1").getValue();
  if (firstCell === "日時") {
    Logger.log("ヘッダーは既に存在します");
  } else {
    sheet.getRange("A1:D1").setValues([["日時", "ユーザー名", "メソッド名", "記録日時"]]);
    sheet.getRange("A1:D1").setFontWeight("bold");
    sheet.setFrozenRows(1);
    Logger.log("ヘッダー行を追加しました");
  }

  // 統計シートの初期化
  updateStatistics();

  Logger.log("次の手順:");
  Logger.log("1. プロジェクトの設定 > スクリプトプロパティ で API_KEY を設定してください");
  Logger.log("2. デプロイ > 新しいデプロイ でWebアプリとしてデプロイしてください");
}
