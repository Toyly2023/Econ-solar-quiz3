/** Bind this script to the Google Sheet used for the shared leaderboard. */
const SHEET_NAME = 'Attempts';
const HEADERS = [
  'timestamp', 'attemptId', 'playerId', 'name', 'factory', 'difficulty',
  'score', 'kwh', 'duration', 'correctCount', 'wrongCount', 'accuracy', 'maxCombo'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const input = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const attemptId = cleanText_(input.attemptId, 100);
    const name = cleanText_(input.name, 80);
    const factory = cleanText_(input.factory || '-', 40);
    const difficulty = cleanText_(input.difficulty, 20);
    if (!attemptId || !name || !['easy', 'medium', 'hard'].includes(difficulty)) {
      throw new Error('Invalid attemptId, name, or difficulty');
    }
    const score = cleanNumber_(input.score);
    const kwh = cleanNumber_(input.kwh);
    const duration = cleanNumber_(input.duration);
    if (score === null || kwh === null || duration === null) {
      throw new Error('Invalid score, kwh, or duration');
    }
    lock.waitLock(30000);
    try {
      const sheet = getSheet_();
      const rows = readRows_(sheet);
      if (!rows.some(row => String(row[1]) === attemptId)) {
        sheet.appendRow([
          new Date(), safeCell_(attemptId), safeCell_(cleanText_(input.playerId, 100)),
          safeCell_(name), safeCell_(factory), difficulty, score, kwh, duration,
          cleanNumber_(input.correctCount) || 0, cleanNumber_(input.wrongCount) || 0,
          cleanNumber_(input.accuracy) || 0, cleanNumber_(input.maxCombo) || 0
        ]);
        SpreadsheetApp.flush();
      }
    } finally {
      lock.releaseLock();
    }
    return json_({ success: true, attemptId: attemptId });
  } catch (error) {
    return json_({ success: false, error: String(error.message || error) });
  }
}

function doGet(e) {
  try {
    const sheet = getSheet_();
    const rows = readRows_(sheet);
    const attemptId = String((e && e.parameter && e.parameter.attemptId) || '');
    const best = new Map();
    rows.forEach(row => {
      const item = {
        name: String(row[3] || ''), factory: String(row[4] || '-'),
        difficulty: String(row[5] || 'medium'), score: Number(row[6]) || 0,
        kwh: Number(row[7]) || 0, duration: Number(row[8]) || 0
      };
      if (!item.name) return;
      const key = item.name.trim().toLocaleLowerCase() + '\u0000' + item.factory.trim().toLocaleLowerCase();
      const previous = best.get(key);
      if (!previous || item.score > previous.score ||
          (item.score === previous.score && item.duration < previous.duration)) {
        best.set(key, item);
      }
    });
    const leaderboard = Array.from(best.values())
      .sort((a, b) => b.score - a.score || a.duration - b.duration ||
        a.name.localeCompare(b.name))
      .slice(0, 20);
    return getOutput_({
      success: true,
      saved: attemptId ? rows.some(row => String(row[1]) === attemptId) : undefined,
      leaderboard: leaderboard
    }, e);
  } catch (error) {
    return getOutput_({ success: false, error: String(error.message || error) }, e);
  }
}

function getSheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('Create this as a script bound to the leaderboard spreadsheet');
  const sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readRows_(sheet) {
  const lastRow = sheet.getLastRow();
  return lastRow <= 1 ? [] : sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
}

function cleanText_(value, maxLength) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

function cleanNumber_(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1000000000 ? number : null;
}

function safeCell_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOutput_(data, e) {
  const callback = String((e && e.parameter && e.parameter.callback) || '');
  if (!callback) return json_(data);
  if (!/^solarCb_[a-zA-Z0-9_]+$/.test(callback)) return json_({ success: false, error: 'Invalid callback' });
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
