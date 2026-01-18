function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var locString = data.location; // e.g. "Auckland, Auckland, New Zealand"
  
  // 1. Determine Tab & Destination
  var locLower = locString.toLowerCase();
  var tabName = "HK"; 
  if (locLower.includes("japan")) tabName = "JP";
  else if (locLower.includes("new zealand")) tabName = "NZ";

  var sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);

  // 2. Logic to split Place and State
  // Example: "Tokyo, Tokyo, Japan" -> parts: ["Tokyo", "Tokyo", "Japan"]
  var parts = locString.split(',').map(s => s.trim());
  var place = parts[0];
  var state = parts[parts.length-1];
  var status = "applied"

  // 3. Append to Sheet: Company, Position, place, state, date, link
  sheet.appendRow([
    data.company, 
    data.role, 
    place, 
    status, 
    new Date().toLocaleDateString(), 
    data.link
  ]);

  return ContentService.createTextOutput(JSON.stringify({ "success": true }))
    .setMimeType(ContentService.MimeType.JSON);
}