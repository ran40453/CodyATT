function doGet(e) {
  try {
    // A) ?ui=1 → 直接回 HtmlService（讓 /exec?ui=1 載入 index.html 並用 google.script.run 取數據）
    if (e && e.parameter && e.parameter.ui === '1') {
      return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('OT Calculation');
    }

    // B) 準備資料（與 getOvertimeData 相同結構）
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0]; // 如需固定名稱可改 getSheetByName('工作表1')
    if (!sheet) throw new Error('找不到工作表');

    const values = sheet.getDataRange().getValues();
    let data = [];
    if (values && values.length > 1) {
      const headers = (values[0] || []).map(h => String(h).trim());
      data = values.slice(1)
        .filter(row => row && row[0] !== '' && row[0] !== null && row[0] !== undefined)
        .map(row => {
          const obj = {};
          headers.forEach((h, idx) => {
            let v = row[idx];
            if (idx === 0) {
              // 日期正規化：Date 物件 → YYYY-MM-DD；字串含 T → 取前 10 碼
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
    }

    const payload = { data };

    // C) 單一 JSONP 參數：僅支援 ?callback=xxx
    const cb = (e && e.parameter) ? e.parameter.callback : null;
    if (cb) {
      const js = `${cb}(${JSON.stringify(payload)})`;
      return ContentService.createTextOutput(js)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    // D) 預設回純 JSON
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    const cb = (e && e.parameter) ? e.parameter.callback : null;
    const errPayload = { error: String(err && err.message ? err.message : err) };
    if (cb) {
      const js = `${cb}(${JSON.stringify(errPayload)})`;
      return ContentService.createTextOutput(js)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(JSON.stringify(errPayload))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 將前端 payload 寫回試算表
 * payload 結構：
 * {
 *   headers: [..],   // 第一列欄名
 *   rows: [ [..], ... ]  // 資料列
 * }
 * 回傳：{ ok:true, wrote:<筆數> } 或 { ok:false, error:"..." }
 */

function saveOvertimeData(payload) {
  try {
    if (!payload || !payload.headers || !payload.rows) {
      return { ok: false, error: 'bad payload' };
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0]; // 如需指定請改 getSheetByName('工作表1')
    if (!sheet) throw new Error('找不到工作表');

    // 全清 & 回寫
    var headers = payload.headers;
    var rows = payload.rows;

    // 避免巨量清空帶走格式，可改成只清內容
    sheet.clearContents();

    // 寫入表頭
    if (headers && headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    // 寫入資料
    if (rows && rows.length) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    // 記錄一下
    Logger.log('[saveOvertimeData] wrote rows = %s', rows ? rows.length : 0);
    return { ok: true, wrote: rows ? rows.length : 0 };

  } catch (err) {
    Logger.log('[saveOvertimeData] error: %s', err);
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}
