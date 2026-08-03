const SHEET_NAME = "responses";
const REPORT_FOLDER_NAME = "AI훈련코치_기업별_결과보고서";
const CREATE_GOOGLE_DOC_REPORTS = true;

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
    const result = appendResponse_(payload);
    return jsonResponse({
      ok: true,
      source: "google-sheets",
      savedId: payload.id || "",
      reportDocId: result.reportDocId || "",
      reportDocUrl: result.reportDocUrl || ""
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
  ensureHeader_(sheet);

  const submittedAt = new Date();
  const row = [
    submittedAt,
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
    payload.scoreMessage || "",
    "",
    ""
  ];

  sheet.appendRow(row);
  const rowNumber = sheet.getLastRow();

  var reportInfo = { reportDocId: "", reportDocUrl: "" };
  if (CREATE_GOOGLE_DOC_REPORTS) {
    reportInfo = createOrUpdateCompanyReport_(payload, submittedAt);
    if (reportInfo.reportDocId) {
      sheet.getRange(rowNumber, 17).setValue(reportInfo.reportDocId);
      sheet.getRange(rowNumber, 18).setValue(reportInfo.reportDocUrl);
    }
  }

  return reportInfo;
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
      scoreMessage: item.scoreMessage || "",
      reportDocId: item.reportDocId || "",
      reportDocUrl: item.reportDocUrl || ""
    };
  });
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }

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
    "scoreMessage",
    "reportDocId",
    "reportDocUrl"
  ]);
}

function createOrUpdateCompanyReport_(payload, submittedAt) {
  const companyName = (payload.companyName || "기업명 미입력").trim();
  const folder = getOrCreateFolder_(REPORT_FOLDER_NAME);
  const fileName = companyName + "_AI훈련코치_결과분석보고서";
  const files = folder.getFilesByName(fileName);

  var doc;
  if (files.hasNext()) {
    doc = DocumentApp.openById(files.next().getId());
  } else {
    doc = DocumentApp.create(fileName);
    const file = DriveApp.getFileById(doc.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  }

  const body = doc.getBody();
  body.clear();

  body.appendParagraph(companyName + " AI훈련코치(강사회) 결과분석 보고서")
    .setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph("최종 갱신: " + formatDateKst_(submittedAt))
    .setForegroundColor("#5c6b7a");
  body.appendHorizontalRule();

  appendSection_(body, "1. 기본 정보", [
    ["회사명", companyName],
    ["응답자", payload.respondentName || "-"],
    ["부서", payload.department || "-"],
    ["직책", payload.position || "-"],
    ["총점", String(payload.totalScore || 0) + "점"],
    ["등급", payload.level || "-"],
    ["권장 방향", payload.recommendation || "-"]
  ]);

  appendBulletSection_(body, "2. 핵심 경영 이슈", payload.managementIssues || [], "등록된 경영 이슈 없음");
  appendBulletSection_(body, "3. 우선 검토 조직", payload.targetDepartments || [], "우선 조직 추가 확인 필요");
  appendBulletSection_(body, "4. 컨설팅 목표", payload.consultingGoals || [], "컨설팅 목표 추가 확인 필요");

  body.appendParagraph("5. 세부 점수 및 개선 포인트")
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  appendScoreTable_(body, payload.scoreMap || {});

  body.appendParagraph("6. 자동 총평")
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(buildAutoSummaryText_(payload));

  body.appendParagraph("7. 강사회 메모")
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(payload.consultingMemo || "추가 메모 없음");

  doc.saveAndClose();

  return {
    reportDocId: doc.getId(),
    reportDocUrl: doc.getUrl()
  };
}

function getOrCreateFolder_(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
}

function appendSection_(body, title, rows) {
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  rows.forEach(function(row) {
    body.appendParagraph(row[0] + ": " + row[1]);
  });
}

function appendBulletSection_(body, title, items, emptyText) {
  body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  if (!items || items.length === 0) {
    body.appendParagraph(emptyText);
    return;
  }

  items.forEach(function(item) {
    body.appendListItem(item);
  });
}

function appendScoreTable_(body, scoreMap) {
  const codes = ["A1", "A2", "B1", "B2", "B3", "B4", "B5", "B6", "B7"];
  const table = body.appendTable();
  const header = table.appendTableRow();
  header.appendTableCell("코드");
  header.appendTableCell("항목");
  header.appendTableCell("점수");
  header.appendTableCell("상태");
  header.appendTableCell("개선책");

  codes.forEach(function(code) {
    const value = typeof scoreMap[code] === "number" ? scoreMap[code] : "";
    const row = table.appendTableRow();
    row.appendTableCell(code);
    row.appendTableCell(getScoreItemMeta_(code));
    row.appendTableCell(value === "" ? "-" : String(value) + "점");
    row.appendTableCell(getScoreHealthLabel_(code, value));
    row.appendTableCell(getScoreImprovementGuide_(code, value));
  });
}

function buildAutoSummaryText_(payload) {
  const companyName = (payload.companyName || "해당 기업").trim();
  const scoreMap = payload.scoreMap || {};
  const scoredItems = ["A1", "A2", "B1", "B2", "B3", "B4", "B5", "B6", "B7"].map(function(code) {
    return {
      code: code,
      name: getScoreItemMeta_(code),
      value: typeof scoreMap[code] === "number" ? scoreMap[code] : -1
    };
  });

  const lowItems = scoredItems
    .filter(function(item) { return item.value >= 0; })
    .sort(function(a, b) { return a.value - b.value; })
    .slice(0, 3)
    .map(function(item) { return item.name; });

  const summary = [
    companyName + "의 현재 진단 결과는 총점 " + String(payload.totalScore || 0) + "점, " + (payload.level || "미산정") + " 수준입니다.",
    (payload.recommendation || "AI 도입 준비도 추가 점검") + " 방향으로 접근하는 것이 적절합니다."
  ];

  if (lowItems.length > 0) {
    summary.push("현재 우선 보완이 필요한 영역은 " + lowItems.join(", ") + " 입니다.");
  }

  if (payload.targetDepartments && payload.targetDepartments.length > 0) {
    summary.push("우선 검토 조직은 " + payload.targetDepartments.join(", ") + " 입니다.");
  }

  if (payload.consultingGoals && payload.consultingGoals.length > 0) {
    summary.push("컨설팅 목표는 " + payload.consultingGoals.join(", ") + " 중심으로 설계하는 것이 좋습니다.");
  }

  return summary.join(" ");
}

function getScoreItemMeta_(code) {
  const labels = {
    A1: "시스템",
    A2: "데이터 관리",
    B1: "AI 이해도 및 활용",
    B2: "AI 데이터 보안",
    B3: "노코드 데이터 분석",
    B4: "데이터 리터러시 및 검증",
    B5: "바이브코딩 활용 수준",
    B6: "제조/피지컬 AI 응용",
    B7: "전산/IT 조직 부서"
  };
  return labels[code] || "세부 항목";
}

function getScoreItemMax_(code) {
  const maxMap = {
    A1: 10,
    A2: 10,
    B1: 10,
    B2: 10,
    B3: 10,
    B4: 10,
    B5: 15,
    B6: 15,
    B7: 10
  };
  return maxMap[code] || 10;
}

function getScoreHealthLabel_(code, value) {
  if (typeof value !== "number") {
    return "미입력";
  }

  const ratio = value / getScoreItemMax_(code);
  if (ratio < 0.4) return "위험";
  if (ratio < 0.75) return "보완";
  return "강점";
}

function getScoreImprovementGuide_(code, value) {
  const guides = {
    A1: "수기·개별 엑셀 중심 운영에서 벗어나 공용 그룹웨어, 업무관리 도구, 기초 ERP 가운데 하나를 우선 정하고 현장 입력 기준을 표준화해야 합니다.",
    A2: "흩어진 파일과 구두 보고를 공용 양식으로 통합하고, 누가 어떤 데이터를 언제 입력·검토할지 책임 체계를 먼저 정해야 합니다.",
    B1: "생성형 AI 기초 교육을 끝내는 데서 멈추지 말고, 보고서 작성·문서 요약·현장 질의응답 같은 실무 과제로 바로 연결해야 합니다.",
    B2: "민감정보 입력 금지 기준, 사내 AI 사용 가이드, 결과 검토 책임자를 먼저 정해 AI 활용과 보안을 같이 관리해야 합니다.",
    B3: "엑셀 기초 분석 자동화와 차트 시각화부터 시작한 뒤, 노코드 도구를 이용한 반복 보고 자동화로 확장하는 것이 좋습니다.",
    B4: "AI가 만든 숫자와 문장을 그대로 쓰지 않도록 원본 대조, 교차 검증, 승인 절차를 업무 흐름 안에 넣어야 합니다.",
    B5: "단순 체험 수준을 넘어서 프롬프트 템플릿, 간단한 자동화 스크립트, 현장용 미니 앱 제작 실습으로 확장해야 합니다.",
    B6: "설비·품질·생산 데이터 중 하나를 골라 파일럿 과제를 만들고, 예지보전이나 품질 이상 탐지처럼 범위를 좁혀 빠르게 검증해야 합니다.",
    B7: "전산 전담자 또는 소규모 TF를 명확히 지정해 데이터 관리, 보안 검토, AI 과제 실행 책임을 한곳으로 모아야 합니다."
  };

  const prefix = typeof value !== "number" ? "미입력 항목입니다. 현재 수준 확인 후 " : "";
  return prefix + (guides[code] || "현재 진단 항목에 맞는 실행 과제를 다시 정리해야 합니다.");
}

function formatDateKst_(date) {
  return Utilities.formatDate(new Date(date), "Asia/Seoul", "yyyy.MM.dd HH:mm:ss");
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
