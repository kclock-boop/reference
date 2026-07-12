const SHEET_NAME = "responses";

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "health";

  if (action === "list") {
    return jsonResponse({
      ok: true,
      source: "google-sheets",
      responses: listResponses_()
    });
  }

  return jsonResponse({
    ok: true,
    source: "google-sheets",
    message: "Taehwa AI assessment endpoint is running."
  });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    appendResponse_(payload);
    return jsonResponse({
      ok: true,
      source: "google-sheets",
      savedId: payload.id || ""
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error)
    });
  }
}

function appendResponse_(payload) {
  const sheet = getSheet_();
  const row = [
    new Date(),
    payload.id || "",
    payload.companyName || "",
    payload.respondentName || "",
    payload.department || "",
    payload.position || "",
    payload.totalScore || 0,
    payload.level || "",
    payload.recommendation || "",
    payload.remainingCount || 0,
    JSON.stringify(payload.scoreMap || {}),
    JSON.stringify(payload.managementIssues || []),
    JSON.stringify(payload.targetDepartments || []),
    JSON.stringify(payload.consultingGoals || []),
    payload.consultingMemo || "",
    payload.scoreMessage || ""
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "submittedAt",
      "id",
      "companyName",
      "respondentName",
      "department",
      "position",
      "totalScore",
      "level",
      "recommendation",
      "remainingCount",
      "scoreMapJson",
      "managementIssuesJson",
      "targetDepartmentsJson",
      "consultingGoalsJson",
      "consultingMemo",
      "scoreMessage"
    ]);
  }

  sheet.appendRow(row);
}

function listResponses_() {
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const header = values[0];
  return values.slice(1).map(function(row) {
    const item = {};
    header.forEach(function(key, index) {
      item[key] = row[index];
    });

    return {
      submittedAt: item.submittedAt,
      id: item.id || "",
      companyName: item.companyName || "",
      respondentName: item.respondentName || "",
      department: item.department || "",
      position: item.position || "",
      totalScore: Number(item.totalScore || 0),
      level: item.level || "",
      recommendation: item.recommendation || "",
      remainingCount: Number(item.remainingCount || 0),
      scoreMap: safeParseObject_(item.scoreMapJson),
      managementIssues: safeParseArray_(item.managementIssuesJson),
      targetDepartments: safeParseArray_(item.targetDepartmentsJson),
      consultingGoals: safeParseArray_(item.consultingGoalsJson),
      consultingMemo: item.consultingMemo || "",
      scoreMessage: item.scoreMessage || ""
    };
  });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function safeParseObject_(value) {
  try {
    return JSON.parse(value || "{}");
  } catch (error) {
    return {};
  }
}

function safeParseArray_(value) {
  try {
    return JSON.parse(value || "[]");
  } catch (error) {
    return [];
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
