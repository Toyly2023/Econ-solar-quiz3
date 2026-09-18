/** Shared top-20 leaderboard stored in this Apps Script project's Script Properties. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var input = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var attemptId = cleanText_(input.attemptId, 64);
    var name = cleanText_(input.name, 25);
    var factory = cleanText_(input.factory || '-', 15);
    var difficulty = cleanText_(input.difficulty, 20);
    var score = cleanNumber_(input.score);
    var kwh = cleanNumber_(input.kwh);
    var duration = cleanNumber_(input.duration);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(attemptId) || !name ||
        !['easy', 'medium', 'hard'].includes(difficulty) ||
        score === null || kwh === null || duration === null) {
      throw new Error('Invalid score submission');
    }

    lock.waitLock(30000);
    try {
      var store = PropertiesService.getScriptProperties();
      var receipts = JSON.parse(store.getProperty('receipts') || '[]');
      if (receipts.indexOf(attemptId) === -1) {
        var leaderboard = JSON.parse(store.getProperty('leaderboard') || '[]');
        var identity = name.toLocaleLowerCase() + '\u0000' + factory.toLocaleLowerCase();
        var existingIndex = leaderboard.findIndex(function(item) {
          return item.name.toLocaleLowerCase() + '\u0000' + item.factory.toLocaleLowerCase() === identity;
        });
        var candidate = {
          name: name, factory: factory, difficulty: difficulty,
          score: score, kwh: kwh, duration: duration
        };
        if (existingIndex === -1) leaderboard.push(candidate);
        else if (score > leaderboard[existingIndex].score ||
                 (score === leaderboard[existingIndex].score && duration < leaderboard[existingIndex].duration)) {
          leaderboard[existingIndex] = candidate;
        }
        leaderboard.sort(compareScores_);
        leaderboard = leaderboard.slice(0, 20);
        receipts = receipts.concat(attemptId).slice(-100);
        store.setProperties({ leaderboard: JSON.stringify(leaderboard), receipts: JSON.stringify(receipts) });
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
    var attemptId = String((e && e.parameter && e.parameter.attemptId) || '');
    var allProperties = PropertiesService.getScriptProperties().getProperties();
    var leaderboard = JSON.parse(allProperties.leaderboard || '[]');
    var receipts = JSON.parse(allProperties.receipts || '[]');
    return getOutput_({
      success: true,
      saved: attemptId ? receipts.indexOf(attemptId) !== -1 : undefined,
      leaderboard: leaderboard
    }, e);
  } catch (error) {
    return getOutput_({ success: false, error: String(error.message || error) }, e);
  }
}

function compareScores_(a, b) {
  return b.score - a.score || a.duration - b.duration || a.name.localeCompare(b.name);
}

function cleanText_(value, maxLength) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

function cleanNumber_(value) {
  var number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1000000000 ? number : null;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOutput_(data, e) {
  var callback = String((e && e.parameter && e.parameter.callback) || '');
  if (!callback) return json_(data);
  if (!/^solarCb_[a-zA-Z0-9_]+$/.test(callback)) {
    return json_({ success: false, error: 'Invalid callback' });
  }
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
