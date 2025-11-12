function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('工作表1'); // ← 確認工作表名稱
    if (!sheet) {
      throw new Error('找不到工作表：工作表1');
    }

    const values = sheet.getDataRange().getValues();
    if (!values || values.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 標題列：轉字串並 trim，避免「Base 」或「 1.67」這類空白造成對不到欄位
    const rawHeaders = values[0] || [];
    const headers = rawHeaders.map(h => String(h).trim());

    const rows = values.slice(1) || [];

    // 資料列：若第 1 欄是日期物件，輸出為 YYYY-MM-DD；若是字串含 'T'，取前 10 碼
    const data = rows
      .filter(row => row && row[0] !== '' && row[0] !== null && row[0] !== undefined)
      .map(row => {
        const obj = {};
        headers.forEach((h, idx) => {
          let v = row[idx];

          // 對第 1 欄（日期）做格式化
          if (idx === 0) {
            if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
              const yyyy = v.getFullYear();
              const mm = String(v.getMonth() + 1).padStart(2, '0');
              const dd = String(v.getDate()).padStart(2, '0');
              v = `${yyyy}-${mm}-${dd}`;
            } else if (typeof v === 'string' && v.includes('T')) {
              v = v.slice(0, 10);
            }
          }

          obj[h] = v;
        });
        return obj;
      });

    const payload = { data };
    const cb = e && e.parameter && e.parameter.callback;

    if (cb) {
      // JSONP：callback({...})
      const js = cb + '(' + JSON.stringify(payload) + ')';
      return ContentService
        .createTextOutput(js)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // 一般 JSON
      return ContentService
        .createTextOutput(JSON.stringify(payload))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    const errPayload = { error: String(err && err.message ? err.message : err) };
    const cb = e && e.parameter && e.parameter.callback;
    if (cb) {
      const js = cb + '(' + JSON.stringify(errPayload) + ')';
      return ContentService
        .createTextOutput(js)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(JSON.stringify(errPayload))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function saveOvertimeData(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0]; // 或 getSheetByName('工作表1')
  const { headers, rows } = payload || {};
  if (!headers || !rows) return { ok: false, error: 'bad payload' };

  // 清空 & 重寫（你也可改 append 或只覆蓋資料區）
  sheet.clearContents();
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  if (rows.length) {
    sheet.getRange(2,1,rows.length,headers.length).setValues(rows);
  }
  return { ok: true, wrote: rows.length };
}