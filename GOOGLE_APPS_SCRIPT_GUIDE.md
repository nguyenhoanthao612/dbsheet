# HƯỚNG DẪN CẤU HÌNH GOOGLE SHEETS & GOOGLE APPS SCRIPT

Tài liệu này hướng dẫn bạn cách thiết lập và liên kết Cơ sở dữ liệu của Google Sheets với ứng dụng Luyện thi IC3 của bạn.

---

## BƯỚC 1: Tạo Google Sheet mới
1. Truy cập [Google Sheets (Trang tính)](https://sheets.google.com) và tạo một bảng tính mới.
2. Đổi tên bảng tính thành bất kỳ tên nào bạn muốn (ví dụ: `CSDL Luyen Thi IC3`).

---

## BƯỚC 2: Mở Trình soạn thảo Apps Script
1. Trên thanh công cụ của bảng tính, chọn **Tiện ích mở rộng (Extensions)** &rarr; **Apps Script**.
2. Một dự án Apps Script mới sẽ được tạo. Xóa toàn bộ mã mặc định có sẵn (`function myFunction() { ... }`).

---

## BƯỚC 3: Dán Mã Nguồn bên dưới vào Apps Script
Hãy sao chép toàn bộ mã nguồn bên dưới và dán vào tệp `Mã.gs` (hoặc `Code.gs`) trong trình soạn thảo Apps Script:

```javascript
// ==========================================
// GOOGLE APPS SCRIPT FOR IC3 EXAM APPLICATION
// ==========================================

function doGet(e) {
  var action = e.parameter.action;
  var sheetName = e.parameter.sheetName;
  
  if (action === 'getInitialData') {
    return handleGetInitialData();
  } else if (action === 'getData') {
    return handleGetData(sheetName);
  }
  
  return jsonResponse({ error: 'INVALID_ACTION', message: 'Hành động không hợp lệ' });
}

function doPost(e) {
  var action = e.parameter.action;
  var postData = {};
  
  try {
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    postData = e.parameter;
  }
  
  if (!action && postData.action) {
    action = postData.action;
  }
  
  if (action === 'initializeDatabase') {
    return handleInitializeDatabase();
  } else if (action === 'addResult') {
    return handleAddResult(postData);
  } else if (action === 'addLoginLog') {
    return handleAddLoginLog(postData);
  } else if (action === 'updateStudent') {
    return handleUpdateStudent(postData);
  } else if (action === 'updateExam') {
    return handleUpdateExam(postData);
  } else if (action === 'updateQuestion') {
    return handleUpdateQuestion(postData);
  } else if (action === 'saveQuestionsBatch') {
    return handleSaveQuestionsBatch(postData);
  } else if (action === 'deleteRow') {
    return handleDeleteRow(postData);
  }
  
  return jsonResponse({ error: 'INVALID_ACTION', message: 'Hành động POST không hợp lệ' });
}

// 1. LẤY DỮ LIỆU BAN ĐẦU (Học sinh, Quản trị viên, Đề thi)
function handleGetInitialData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  var sheetNames = sheets.map(function(s) { return s.getName(); });
  
  return jsonResponse({
    sheetNames: sheetNames,
    students: getSheetDataAsObjects('students'),
    admin: getSheetDataAsObjects('admin'),
    exam_catalog: getSheetDataAsObjects('exam_catalog')
  });
}

// 2. LẤY DỮ LIỆU CỦA MỘT TRANG TÍNH CỤ THỂ (Kết quả, Hoặc Bộ câu hỏi đề thi)
function handleGetData(sheetName) {
  if (!sheetName) {
    return jsonResponse({ error: 'MISSING_SHEET_NAME', message: 'Thiếu tên trang tính' });
  }
  var data = getSheetDataAsObjects(sheetName);
  return jsonResponse(data);
}

// 3. LƯU KẾT QUẢ THI
function handleAddResult(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('results') || ss.insertSheet('results');
  
  // Đảm bảo có dòng đầu tiêu đề nếu trống
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'id', 'student_id', 'fullname', 'school', 'class', 
      'level', 'exam_id', 'exam_name', 'score', 'correct', 
      'incorrect', 'duration', 'timestamp'
    ]);
  }
  
  var newId = 'res_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
  var timestamp = new Date().toISOString();
  
  sheet.appendRow([
    newId,
    data.student_id || '',
    data.fullname || '',
    data.school || '',
    data.class || '',
    data.level || '',
    data.exam_id || '',
    data.exam_name || '',
    data.score !== undefined ? Number(data.score) : 0,
    data.correct !== undefined ? Number(data.correct) : 0,
    data.incorrect !== undefined ? Number(data.incorrect) : 0,
    data.duration !== undefined ? Number(data.duration) : 0,
    timestamp
  ]);
  
  return jsonResponse({ success: true, id: newId, timestamp: timestamp });
}

// 4. GHI NHẬT KÝ ĐĂNG NHẬP / ĐĂNG XUẤT
function handleAddLoginLog(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('login_logs') || ss.insertSheet('login_logs');
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['timestamp', 'student_id', 'fullname', 'school', 'class', 'status']);
  }
  
  var timestamp = new Date().toISOString();
  sheet.appendRow([
    timestamp,
    data.student_id || '',
    data.fullname || '',
    data.school || '',
    data.class || '',
    data.status || ''
  ]);
  
  return jsonResponse({ success: true, timestamp: timestamp });
}

// 5. CẬP NHẬT HOẶC THÊM MỚI HỌC SINH
function handleUpdateStudent(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('students');
  if (!sheet) {
    return jsonResponse({ error: 'SHEET_NOT_FOUND', message: 'Không tìm thấy bảng học sinh' });
  }
  
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) { return h.toString().trim(); });
  
  var studentIdCol = headers.indexOf('student_id');
  if (studentIdCol === -1) {
    return jsonResponse({ error: 'INVALID_HEADERS', message: 'Bảng học sinh thiếu cột student_id' });
  }
  
  var studentId = data.student_id;
  if (!studentId) {
    return jsonResponse({ error: 'MISSING_STUDENT_ID', message: 'Thiếu mã học sinh' });
  }
  
  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][studentIdCol]).trim() === String(studentId).trim()) {
      rowIndex = i + 1; // 1-indexed và cộng thêm dòng tiêu đề
      break;
    }
  }
  
  // Các cột cần cập nhật dữ liệu
  var updateData = {
    'student_id': data.student_id,
    'fullname': data.fullname,
    'school': data.school,
    'class': data.class,
    'password': data.password !== undefined ? data.password : '123456',
    'level': data.level !== undefined ? data.level : '1',
    'status': data.status !== undefined ? data.status : 'active'
  };
  
  if (rowIndex !== -1) {
    // Cập nhật học sinh hiện tại
    for (var colName in updateData) {
      var colIdx = headers.indexOf(colName);
      if (colIdx !== -1 && updateData[colName] !== undefined) {
        sheet.getRange(rowIndex, colIdx + 1).setValue(updateData[colName]);
      }
    }
  } else {
    // Thêm học sinh mới
    var newRow = [];
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j];
      newRow.push(updateData[headerName] !== undefined ? updateData[headerName] : '');
    }
    sheet.appendRow(newRow);
  }
  
  return jsonResponse({ success: true, message: rowIndex !== -1 ? 'Đã cập nhật học sinh' : 'Đã thêm học sinh mới' });
}

// --- TIỆN ÍCH TRỢ GIÚP (HELPER FUNCTIONS) ---

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetDataAsObjects(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0].map(function(h) { return h.toString().trim(); });
  var result = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    var hasData = false;
    for (var j = 0; j < headers.length; j++) {
      if (headers[j]) {
        var val = row[j];
        if (val instanceof Date) {
          obj[headers[j]] = val.toISOString();
        } else {
          obj[headers[j]] = val;
        }
        if (val !== '') hasData = true;
      }
    }
    if (hasData) {
      result.push(obj);
    }
  }
  return result;
}

// KHỞI TẠO CẤU TRÚC CƠ SỞ DỮ LIỆU SẠCH (KHÔNG CÓ DỮ LIỆU MẪU)
function handleInitializeDatabase() {
  try {
    initSheets();
    return jsonResponse({ success: true, message: 'Đã khởi tạo cấu trúc cơ sở dữ liệu thành công' });
  } catch (err) {
    return jsonResponse({ success: false, error: 'INIT_FAILED', message: err.toString() });
  }
}

function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Tạo bảng Học sinh (students) nếu chưa có
  if (!ss.getSheetByName('students')) {
    var sheet = ss.insertSheet('students');
    sheet.appendRow(['student_id', 'fullname', 'class', 'school', 'password', 'level', 'streak', 'status']);
  }
  
  // 2. Tạo bảng Quản trị (admin) nếu chưa có
  if (!ss.getSheetByName('admin')) {
    var sheet = ss.insertSheet('admin');
    sheet.appendRow(['username', 'fullname', 'password', 'role', 'status']);
  }
  
  // 3. Tạo bảng Đề thi (exam_catalog) nếu chưa có
  if (!ss.getSheetByName('exam_catalog')) {
    var sheet = ss.insertSheet('exam_catalog');
    sheet.appendRow(['exam_id', 'level', 'exam_name', 'category', 'time_limit', 'sheet_name', 'active']);
  }
  
  // 4. Tạo bảng Kết quả thi (results) nếu chưa có
  if (!ss.getSheetByName('results')) {
    var sheet = ss.insertSheet('results');
    sheet.appendRow([
      'id', 'student_id', 'fullname', 'school', 'class', 
      'level', 'exam_id', 'exam_name', 'score', 'correct', 
      'incorrect', 'duration', 'timestamp'
    ]);
  }
  
  // 5. Tạo bảng Nhật ký đăng nhập (login_logs) nếu chưa có
  if (!ss.getSheetByName('login_logs')) {
    var sheet = ss.insertSheet('login_logs');
    sheet.appendRow(['timestamp', 'student_id', 'fullname', 'school', 'class', 'status']);
  }
  
  // Xóa sheet mặc định "Trang tính1" hoặc "Sheet1" nếu có để giao diện gọn gàng
  var defaultSheet1 = ss.getSheetByName('Trang tính1') || ss.getSheetByName('Sheet1');
  if (defaultSheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet1);
  }
}

// 6. CẬP NHẬT HOẶC THÊM MỚI ĐỀ THI (Cập nhật exam_catalog)
function handleUpdateExam(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('exam_catalog');
  if (!sheet) {
    return jsonResponse({ error: 'SHEET_NOT_FOUND', message: 'Không tìm thấy bảng đề thi (exam_catalog)' });
  }
  
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) { return h.toString().trim(); });
  
  var examIdCol = headers.indexOf('exam_id');
  if (examIdCol === -1) {
    return jsonResponse({ error: 'INVALID_HEADERS', message: 'Bảng đề thi thiếu cột exam_id' });
  }
  
  var examId = data.exam_id;
  if (!examId) {
    return jsonResponse({ error: 'MISSING_EXAM_ID', message: 'Thiếu mã đề thi' });
  }
  
  // Kiểm tra đổi tên bảng và cập nhật sheet tương ứng
  if (data.old_sheet_name && data.old_sheet_name !== data.sheet_name) {
    var oldSheet = ss.getSheetByName(data.old_sheet_name);
    if (oldSheet) {
      oldSheet.setName(data.sheet_name);
    }
  }
  
  var searchId = data.old_exam_id || examId;
  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][examIdCol]).trim() === String(searchId).trim()) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var updateData = {
    'exam_id': data.exam_id,
    'level': data.level !== undefined ? String(data.level) : '1',
    'exam_name': data.exam_name || '',
    'category': data.category || 'computing_fundamentals',
    'time_limit': data.time_limit !== undefined ? String(data.time_limit) : '15',
    'sheet_name': data.sheet_name || data.exam_id,
    'active': data.active !== undefined ? String(data.active).toUpperCase() : 'TRUE'
  };
  
  if (rowIndex !== -1) {
    for (var colName in updateData) {
      var colIdx = headers.indexOf(colName);
      if (colIdx !== -1 && updateData[colName] !== undefined) {
        sheet.getRange(rowIndex, colIdx + 1).setValue(updateData[colName]);
      }
    }
  } else {
    var newRow = [];
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j];
      newRow.push(updateData[headerName] !== undefined ? updateData[headerName] : '');
    }
    sheet.appendRow(newRow);
  }
  
  // Tự động tạo sheet câu hỏi cho đề thi mới nếu chưa có
  var examSheetName = updateData['sheet_name'];
  if (!ss.getSheetByName(examSheetName)) {
    var newSheet = ss.insertSheet(examSheetName);
    newSheet.appendRow(['id', 'type', 'category', 'question', 'image', 'options', 'answer', 'explanation', 'tip']);
  }
  
  return jsonResponse({ success: true, message: rowIndex !== -1 ? 'Đã cập nhật đề thi' : 'Đã thêm đề thi mới' });
}

// 7. CẬP NHẬT HOẶC THÊM MỚI CÂU HỎI TRONG ĐỀ THI CỤ THỂ
function handleUpdateQuestion(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = data.sheet_name || data.test_id;
  if (!sheetName) {
    return jsonResponse({ error: 'MISSING_SHEET_NAME', message: 'Thiếu tên bảng đề thi' });
  }
  
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['id', 'type', 'category', 'question', 'image', 'options', 'answer', 'explanation', 'tip']);
  }
  
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) { return h.toString().trim(); });
  
  var idCol = headers.indexOf('id');
  if (idCol === -1) {
    return jsonResponse({ error: 'INVALID_HEADERS', message: 'Bảng câu hỏi thiếu cột id' });
  }
  
  var qId = data.id;
  if (!qId) {
    return jsonResponse({ error: 'MISSING_QUESTION_ID', message: 'Thiếu mã câu hỏi (id)' });
  }
  
  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]).trim() === String(qId).trim()) {
      rowIndex = i + 1;
      break;
    }
  }
  
  // Tạo đối tượng dữ liệu cập nhật động (hỗ trợ không giới hạn số lượng optionA, optionB, optionC, ..., optionZ)
  var updateData = {};
  for (var key in data) {
    updateData[key] = data[key];
  }
  updateData['id'] = qId;
  if (!updateData['type']) updateData['type'] = 'multiple_choice';
  if (!updateData['category']) updateData['category'] = 'computing_fundamentals';
  if (!updateData['question']) updateData['question'] = '';
  if (!updateData['answer']) updateData['answer'] = '';
  
  if (rowIndex !== -1) {
    for (var colName in updateData) {
      var colIdx = headers.indexOf(colName);
      if (colIdx !== -1 && updateData[colName] !== undefined) {
        sheet.getRange(rowIndex, colIdx + 1).setValue(updateData[colName]);
      }
    }
  } else {
    var newRow = [];
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j];
      newRow.push(updateData[headerName] !== undefined ? updateData[headerName] : '');
    }
    sheet.appendRow(newRow);
  }
  
  return jsonResponse({ success: true, message: rowIndex !== -1 ? 'Đã cập nhật câu hỏi' : 'Đã thêm câu hỏi mới' });
}

// 8. CẬP NHẬT HÀNG LOẠT CÂU HỎI TRONG ĐỀ THI CỤ THỂ (Dùng cho AI Import)
function handleSaveQuestionsBatch(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = data.sheet_name || data.test_id;
  if (!sheetName) {
    return jsonResponse({ error: 'MISSING_SHEET_NAME', message: 'Thiếu tên bảng đề thi' });
  }
  
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['id', 'type', 'category', 'question', 'image', 'options', 'answer', 'explanation', 'tip']);
  }
  
  var questions = data.questions;
  if (!questions || !Array.isArray(questions)) {
    return jsonResponse({ error: 'INVALID_QUESTIONS_DATA', message: 'Dữ liệu danh sách câu hỏi không hợp lệ' });
  }
  
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) { return h.toString().trim(); });
  var idCol = headers.indexOf('id');
  
  if (idCol === -1) {
    return jsonResponse({ error: 'INVALID_HEADERS', message: 'Bảng câu hỏi thiếu cột id' });
  }
  
  var addedCount = 0;
  var updatedCount = 0;
  
  for (var k = 0; k < questions.length; k++) {
    var q = questions[k];
    var qId = q.id;
    if (!qId) continue;
    
    // Tìm dòng trùng bằng cách đọc lại các dòng của sheet hiện tại
    values = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][idCol]).trim() === String(qId).trim()) {
        rowIndex = i + 1;
        break;
      }
    }
    
    // Tạo đối tượng dữ liệu cập nhật động (hỗ trợ không giới hạn số lượng optionA, optionB, optionC, ..., optionZ)
    var updateData = {};
    for (var key in q) {
      updateData[key] = q[key];
    }
    updateData['id'] = qId;
    if (!updateData['type']) updateData['type'] = 'multiple_choice';
    if (!updateData['category']) updateData['category'] = 'computing_fundamentals';
    if (!updateData['question']) updateData['question'] = '';
    if (!updateData['answer']) updateData['answer'] = '';
    
    if (rowIndex !== -1) {
      for (var colName in updateData) {
        var colIdx = headers.indexOf(colName);
        if (colIdx !== -1 && updateData[colName] !== undefined) {
          sheet.getRange(rowIndex, colIdx + 1).setValue(updateData[colName]);
        }
      }
      updatedCount++;
    } else {
      var newRow = [];
      for (var j = 0; j < headers.length; j++) {
        var headerName = headers[j];
        newRow.push(updateData[headerName] !== undefined ? updateData[headerName] : '');
      }
      sheet.appendRow(newRow);
      addedCount++;
    }
  }
  
  return jsonResponse({ 
    success: true, 
    message: 'Đã lưu hàng loạt câu hỏi thành công', 
    added: addedCount, 
    updated: updatedCount 
  });
}

// 9. XÓA DÒNG DỮ LIỆU TỔNG QUÁT (Dành cho việc Xóa học sinh, Xóa đề thi, Xóa câu hỏi)
function handleDeleteRow(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = data.sheet_name;
  var keyColumn = data.key_column;
  var keyValue = data.key_value;
  
  if (!sheetName || !keyColumn || !keyValue) {
    return jsonResponse({ error: 'MISSING_PARAMS', message: 'Thiếu tham số xóa dữ liệu' });
  }
  
  // Nếu đang xóa một dòng trong danh mục đề thi (exam_catalog), tự động xóa luôn bảng/sheet câu hỏi tương ứng
  if (sheetName === 'exam_catalog' && keyColumn === 'exam_id') {
    var examSheet = ss.getSheetByName(keyValue);
    if (examSheet) {
      ss.deleteSheet(examSheet);
    }
  }
  
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return jsonResponse({ error: 'SHEET_NOT_FOUND', message: 'Không tìm thấy bảng để xóa' });
  }
  
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function(h) { return h.toString().trim(); });
  
  var colIdx = headers.indexOf(keyColumn);
  if (colIdx === -1) {
    return jsonResponse({ error: 'COLUMN_NOT_FOUND', message: 'Không tìm thấy cột để đối chiếu' });
  }
  
  var deletedCount = 0;
  // Duyệt từ dưới lên để tránh bị lệch dòng khi xóa
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][colIdx]).trim() === String(keyValue).trim()) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  
  return jsonResponse({ success: true, message: 'Đã xóa ' + deletedCount + ' dòng dữ liệu' });
}
}
```

---

## BƯỚC 4: Triển khai Ứng dụng Web (Crucial)
Đây là bước **quan trọng nhất** để ứng dụng của bạn có thể giao tiếp với bảng tính:

1. Ở góc trên cùng bên phải của trình soạn thảo Apps Script, nhấp vào nút **Triển khai (Deploy)** &rarr; Chọn **Tập lệnh triển khai mới (New deployment)**.
2. Nhấp vào biểu tượng **Bánh răng** cạnh chữ "Chọn loại" (Select type) và chọn **Ứng dụng web (Web app)**.
3. Điền cấu hình như sau:
   - **Mô tả (Description):** CSDL Luyện thi IC3
   - **Chạy dưới dạng (Execute as):** Chọn **Tôi (Your email - @gmail.com)**.
   - **Ai có quyền truy cập (Who has access):** BẮT BUỘC chọn **Bất kỳ ai (Anyone)**. *(Nếu chọn "Chỉ mình tôi", ứng dụng web sẽ không thể kết nối được)*.
4. Nhấp vào nút **Triển khai (Deploy)**.
5. Nếu đây là lần đầu triển khai, Google sẽ yêu cầu bạn **Ủy quyền truy cập (Authorize Access)**:
   - Nhấp vào **Ủy quyền truy cập (Authorize Access)**.
   - Chọn tài khoản Google của bạn.
   - Thấy cảnh báo "Google chưa xác minh ứng dụng này", hãy nhấp vào **Nâng cao (Advanced)** ở góc dưới bên trái &rarr; Chọn **Đi tới ... (Không an toàn) / Go to ... (unsafe)**.
   - Nhấp vào **Cho phép (Allow)**.
6. Sau khi hoàn tất, Google sẽ cung cấp cho bạn một **URL Ứng dụng web (Web app URL)** (có đuôi là `/exec`). Hãy **Sao chép (Copy)** URL này!

---

## BƯỚC 5: Liên kết với Ứng dụng Luyện thi IC3
1. Quay lại ứng dụng Luyện thi IC3 của bạn.
2. Tại màn hình Đăng nhập (hoặc Đăng ký), nhấp vào dòng chữ **Cấu hình Google Sheets (Đồng bộ)** phía dưới cùng.
3. Dán URL đã sao chép ở Bước 4 vào ô nhập liệu.
4. Bấm **LƯU & ĐỒNG BỘ**.
5. Giao diện sẽ báo thành công và tự động tải danh sách Học sinh mẫu (`HS001`, `HS002`, `HS003`, `HS004`) trực tiếp từ Google Sheet của bạn về! Bây giờ bạn đã có thể đăng nhập bằng các tài khoản này!
