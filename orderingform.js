function onOpen() {
    var ui = SpreadsheetApp.getUi();
    // Or DocumentApp or FormApp.
    ui.createMenu('Custom Ordering Menu')
        .addItem('Summarize Orders!', 'processRows')
        .addItem('Add New Option', 'addOrderingOption')
        .addToUi();
    processRows();
}

function orderItem() {
    const ordering_form = FormApp.openByUrl('https://docs.google.com/forms/d/1Wt7ug-ZrMIYjYMcaT57twKxidJZnxt4YEcABkgcEF98/edit')
    return ordering_form.getItems()[0].asMultipleChoiceItem(); // brUh https://developers.google.com/apps-script/reference/forms/item#ascheckboxitem https://stackoverflow.com/a/30359531/10372825
}

function getCurrentOptions() {
    return orderItem().getChoices().map(choice => choice.getValue());
}

function addChoice(choice) {
    const og_choices = orderItem().getChoices();
    orderItem().setChoices([...og_choices, orderItem().createChoice(choice)]);
}

function timenow() {
    // yoinked from https://stackoverflow.com/a/6838658/10372825
    var now = new Date(),
        ampm = 'am',
        h = now.getHours(),
        m = now.getMinutes(),
        s = now.getSeconds();
    if (h >= 12) {
        if (h > 12) h -= 12;
        ampm = 'pm';
    }

    if (m < 10) m = '0' + m;
    if (s < 10) s = '0' + s;
    return now.toLocaleDateString() + ' ' + h + ':' + m + ':' + s + ' ' + ampm;
}

function processRows() {
    const ss = SpreadsheetApp.getActive();
    const reqs = ss.getSheetByName('IncomingRequests')
    const data = reqs.getDataRange().getValues().slice(1);

    const DEFAULT_OPT = row => ({ date: row[0], names: new Set() });
    const ACCUMULATE = (acc, row) => { acc.names.add(row[1]) };

    if (reqs.getLastRow() === 1) {
        SpreadsheetApp.getUi().alert('Huzzah, no new orders! The lab is in order.');
        return;
    }

    let existing_items = new Set(getCurrentOptions());
    let dedupe = new Map();
    for (let row of data) {
        if (row[2].trim().length == 0) continue;
        if (!dedupe.has(row[2].toLowerCase())) {
            dedupe.set(row[2].toLowerCase(), DEFAULT_OPT(row))
            if (!existing_items.has(row[2].toLowerCase())) {
                const got = showPrompt(`Never before seen item '${row[2]}'! What should we add it as? (empty for default)`);
                if (got !== null) addChoice(got === '' ? row[2] : got);
            }
        }
        ACCUMULATE(dedupe.get(row[2].toLowerCase()), row);
    }
    // export data to new sheet
    const created_sheet = ss.insertSheet(timenow());
    const export_data = [...dedupe.entries()].map(row => [ row[0], row[1].names.size, row[1].date ]);
    if (export_data.length > 0) created_sheet
        .getRange(1, 1, export_data.length+1, export_data[0].length)
        .setValues([['Item', '# of Requesters', 'Requested Since'], ...export_data]);
    // delete processed cells
    const delete_range = reqs.getRange(2, 1, reqs.getLastRow(), reqs.getLastColumn());
    //delete_range.deleteCells(SpreadsheetApp.Dimension.ROWS);
}

function showPrompt(message) {
  var ui = SpreadsheetApp.getUi(); // Same variations.

  var result = ui.prompt(message, ui.ButtonSet.OK_CANCEL);

  // Process the user's response.
  var button = result.getSelectedButton();
  var text = result.getResponseText();
  if (button == ui.Button.OK)
      return text;
  else // cancelled or closed
      return null;
}

function addOrderingOption() {
    const new_choice = showPrompt('What option should be added?')
    if (new_choice !== null) addChoice(new_choice);
}

