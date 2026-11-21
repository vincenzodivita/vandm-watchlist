// ============================================================================
// V&M Watchlist - Google Apps Script (Code.gs)
// Supporta: Sync link, Watchlist, Segna come visto, Rewatch (Più date di visione)
// ============================================================================

function doGet(e) {
  var action = e.parameter.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // 1. Recupera tutti i film salvati
  if (action === 'getAll') {
    var data = sheet.getDataRange().getValues();
    var movies = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0]) continue;
      
      var rawDate = row[6];
      var formattedDate = '';
      if (rawDate) {
        if (rawDate instanceof Date) {
          formattedDate = Utilities.formatDate(rawDate, "GMT", "yyyy-MM-dd");
        } else {
          formattedDate = String(rawDate).trim();
        }
      }
      
      movies.push({
        user: String(row[0]).toLowerCase(),
        movieId: row[1],
        title: row[2],
        year: row[3],
        poster: row[4],
        seen: row[5] === true || String(row[5]).toUpperCase() === 'TRUE',
        seenDate: formattedDate
      });
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, movies: movies }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // 2. Recupera link sincronizzazione video (Watch Together)
  if (action === 'getSyncLink') {
    var link = PropertiesService.getScriptProperties().getProperty('syncWatchLink') || '';
    return ContentService.createTextOutput(JSON.stringify({ success: true, link: link }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Azione non valida' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var action = payload.action;

    // Salva link Watch Together
    if (action === 'saveSyncLink') {
      PropertiesService.getScriptProperties().setProperty('syncWatchLink', payload.link || '');
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();

    // Aggiungi film alla lista
    if (action === 'add') {
      sheet.appendRow([
        payload.user,
        payload.movieId,
        payload.title,
        payload.year,
        payload.poster,
        false,
        ''
      ]);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // Rimuovi film dalla lista
    if (action === 'remove') {
      for (var i = data.length - 1; i >= 1; i--) {
        if (String(data[i][0]).toLowerCase() === String(payload.user).toLowerCase() && 
            String(data[i][1]) === String(payload.movieId)) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    // Segna come visto / Rewatch (aggiorna stato e date di visione)
    if (action === 'markSeen') {
      var seenVal = payload.seen === true || payload.seen === 'true';
      var seenDateVal = seenVal ? (payload.seenDate || Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd")) : '';
      
      // Assicura l'intestazione nella colonna 7 se non presente
      if (sheet.getLastColumn() < 7 || !sheet.getRange(1, 7).getValue()) {
        sheet.getRange(1, 7).setValue('Seen Date');
      }

      for (var i = 1; i < data.length; i++) {
        if (String(data[i][1]) === String(payload.movieId)) {
          sheet.getRange(i + 1, 6).setValue(seenVal);
          sheet.getRange(i + 1, 7).setValue(seenDateVal);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Azione sconosciuta' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
