/** 
** Timesheet Enhancer for UKG Ready is a chrome extension to add some
** extra options to the Timesheet of the product UKG Ready.
** UKG Ready is a product from UKG <https://www.ukg.com>
** Copyright (C) 2024-2025 Yoann Calamai
**
** This program is free software: you can redistribute it and/or modify
** it under the terms of the GNU General Public License as published by
** the Free Software Foundation, either version 3 of the License, or
** (at your option) any later version.
**
** This program is distributed in the hope that it will be useful,
** but WITHOUT ANY WARRANTY; without even the implied warranty of
** MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
** GNU General Public License for more details.
**
** You should have received a copy of the GNU General Public License
** along with this program.  If not, see <https://www.gnu.org/licenses/>. 
**
* @author Yoann Calamai
**/


loadTSBooster();

/* entry point of the extension
** 
** no param
** returns {void}
*/
async function loadTSBooster() {

  // get extension user options
  const isDebugModeEnabled = await getOption("DebugMode");

  if (isDebugModeEnabled) {
    console.log("Debug Mode enabled!");
    console.log("D34D833F15W47CH1N6Y0U");
  }


  TimeSheetLoadedWatcher(isDebugModeEnabled);
}

/* run the extension payload once the page is fully loaded
** 
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {void}
*/
async function TimeSheetLoadedWatcher(isDebugModeEnabled) {

  // get extension user options
  const isCountersInEntryTabEnabled = await getOption("CountersInEntryTab");
  const hiddenColumnsList = await getOption("HiddenColumns");

  // look for DOM mutations in order to modifiy TS only once it is loaded and on the right tab
  const divFeature = document.querySelector('#_feature');

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {

      // get the timesheet form
      const tsForm = document.querySelector('.c-timesheet-table-form');

      //get the timesheet selected tab
      const tsSelectedTab = document.querySelector("li > button[aria-selected='true']");

      // if the timesheet form is loaded AND save button is enabled AND Time Entry tab is selected
      const saveButtonNames = ["Save", "Enregistrer"]
      if (tsForm &&
        saveButtonNames.includes(mutation.target.ariaLabel) &&
        tsSelectedTab.dataset.category === "category-TIME_ENTRY") {

        if (typeof hiddenColumnsList === "string" && hiddenColumnsList.length > 0)
          hideColumns(hiddenColumnsList, isDebugModeEnabled);

        //freezeColumns("From;To;De;À", isDebugModeEnabled);

        if (isCountersInEntryTabEnabled)
          addSummaryByDayCountersToTimeentryTab(isDebugModeEnabled);
      }
    });
  });

  observer.observe(divFeature, { attributes: true, subtree: true });
}

/// --------------------------------
/// Freeze columns in Time Entry tab
/// --------------------------------

/* entrypoint for frozenColumnInEntryTab option
** 
** @param {string} frozenColumnsList - list of column names separated by ;
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {void}
*/
function freezeColumns(frozenColumnsList, isDebugModeEnabled) {
  if (isDebugModeEnabled) {
    console.log("--------------");
    console.log("Freeze columns in Time Entry tab feature");
    console.log("-- function freezeColumns")
    console.log("@param frozenColumnsList");
    console.log(frozenColumnsList);
  }

  applyOnTimeEntryColumns(frozenColumnsList,
    (cell) => {
      cell.className = "c-table__fixed-cell";
      cell.classList.add("c-table__desktop-view", "m-vertical-align-middle", "m-default-column", "m-minimize-width");
    },
    isDebugModeEnabled);
}

/// --------------------------------
/// Hide columns in Time Entry tab
/// --------------------------------

/* entrypoint for hideColumnInEntryTab option
** 
** @param {string} hiddenColumnsList - list of column names separated by ;
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {void}
*/
function hideColumns(hiddenColumnsList, isDebugModeEnabled) {
  if (isDebugModeEnabled) {
    console.log("--------------");
    console.log("Hide columns in Time Entry tab feature");
    console.log("-- function hideColumns")
    console.log("@param hiddenColumnsList");
    console.log(hiddenColumnsList);
  }

  applyOnTimeEntryColumns(hiddenColumnsList,
    (cell) => cell.className = 'hidden',
    isDebugModeEnabled);

}

/// --------------------------------
/// Add Summary by Day Counters in Time Entry tab
/// --------------------------------

/* entrypoint for CountersInEntryTab option
** 
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {void}
*/
async function addSummaryByDayCountersToTimeentryTab(isDebugModeEnabled) {
  if (isDebugModeEnabled) {
    console.log("--------------");
    console.log("Add Summary by Day Counters in Time Entry tab feature");
    console.log("-- function addSummaryByDayCountersToTimeentryTab");
  }

  // get timesheet config
  const config = await getTimesheetConfigData(false);
  if(isDebugModeEnabled){
    console.log("timesheet config data");
    console.log(config);
  }
  const showWeekTotals = config.summary_by_day.show_week_totals;
  const startdate = new Date(config.start_date);
  const enddate = new Date(config.end_date);

  // get summary by day data
  const summary = await getCountersFromSummaryByDay(false);

  if(isDebugModeEnabled){
    console.log("summary by tab data");
    console.log(summary);
  }

  // add counters to table header
  const tsFormTableHeader = document.querySelector('.c-timesheet-table-form > div > table > thead > tr');
  const nbOfDisplayedColumns = getNumberOfDisplayedColumnsOnTimeEntry(isDebugModeEnabled)-2; // minus first & last columns
  const cnts = summary.daily[0].items.filter(c => c.type === 'COUNTER').map(cnt => cnt.name);
  addCountersToTableHeader(cnts, tsFormTableHeader, isDebugModeEnabled);

  // add daily counters to table body
  const tsFormTableBody = document.querySelector('.c-timesheet-table-form > div > table > tbody');
  addDailyCountersToTableBody(summary.daily, tsFormTableBody, startdate, enddate, isDebugModeEnabled);

  // add weekly counters to table body
  if(showWeekTotals && summary.weekly){
    addWeeklyCountersToTable(summary.weekly, tsFormTableBody, nbOfDisplayedColumns, startdate, enddate, isDebugModeEnabled);
  }

  // add period counters to table body
  addPayPeriodCountersToTable(summary.timesheet, tsFormTableBody, nbOfDisplayedColumns, isDebugModeEnabled);
}

/* insert counter pay period values to the table body
** 
** @param {Array} payperioddata - list of pay period counters from API to add
** @param {NodeList} tsFormTableBody - body of the timesheet table
** @param {number} initialNbOfColumns - number of columns before the extension changed
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {void}
*/
function addPayPeriodCountersToTable(payperioddata, tsFormTableBody, initialNbOfColumns, isDebugModeEnabled){
  if (isDebugModeEnabled) {
    console.log("-- function addPayPeriodCountersToTable")
    console.log("@param payperioddata");
    console.log(payperioddata);
    console.log("@param tsFormTableBody");
    console.log(tsFormTableBody);
    console.log("@param initialNbOfColumns");
    console.log(initialNbOfColumns);
  }

  // build the pay period totals row with counters data
  const counters = payperioddata.filter(c => c.type === 'COUNTER');
  const tr = createTotalRow("Pay period totals", counters, initialNbOfColumns);

  // add it at the end of teh body
  tsFormTableBody.appendChild(tr);
}


/* insert counter weekly values to the table body
** 
** @param {Array} weeklydata - list of weekly counters from API to add
** @param {NodeList} tsFormTableBody - body of the timesheet table
** @param {number} initialNbOfColumns - number of columns before the extension changed
** @param {Date} startdate - start date of the timesheet
** @param {Date} enddate - end date of the timesheet
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {void}
*/
function addWeeklyCountersToTable(weeklydata, tsFormTableBody, initialNbOfColumns, startdate, enddate, isDebugModeEnabled){
  if (isDebugModeEnabled) {
    console.log("-- function addWeeklyCountersToTable")
    console.log("@param weeklydata");
    console.log(weeklydata);
    console.log("@param tsFormTableBody");
    console.log(tsFormTableBody);
    console.log("@param initialNbOfColumns");
    console.log(initialNbOfColumns);
  }

  weeklydata.forEach(w => {
    // build the weekly totals row with counters data
    const counters = w.items.filter(c => c.type === 'COUNTER');
    const tr = createTotalRow("Weekly totals", counters, initialNbOfColumns);

    //look for the position of the week.date_to row
    const lastDow = new Date(w.date_to);
    const rowposition = findRowPositionByDate(tsFormTableBody.childNodes, lastDow, startdate, enddate);
    
    //insert the row after the last row
    if(rowposition >= 0){

      // get page language
      const lang = getLanguage();

      // get the number of sunday rows without exception
      const lastDowStr = `${lastDow.toLocaleDateString(lang,{weekday:"short"}).toUpperCase()} ${lastDow.getDate()} ${lastDow.toLocaleDateString(lang,{month:"short"})}`;
      const sel = '*:not([id^="exception"])[data-group-date*="'+lastDowStr+'"]';
      const lastDowRows = tsFormTableBody.querySelectorAll(sel).length;

      // calculate index
      const index = rowposition+lastDowRows;
      if(index+1 < tsFormTableBody.childNodes.length)
        tsFormTableBody.insertBefore(tr, tsFormTableBody.childNodes[index]);
      else
        tsFormTableBody.appendChild(tr);
    }
  });
}

/* find the tr position in the timesheet body table tr list 
** based on a given date
** 
** @param {NodeList} trlist - list of tr of the timesheet body table
** @param {Date} day - date to find out
** @param {Date} startdate - start date of the timesheet
** @param {Date} enddate - end date of the timesheet
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {number} position of the tr inn th tr list, returns -1 if not found
*/
function findRowPositionByDate(trlist, day, startdate, enddate){
  const trarray = Array.from(trlist);
  const pos = trarray.findIndex(node => {

    // don't touch the exception row
    // and the newly added weekly totals row
    if (node.id.startsWith("exception_") ||
        !node.hasAttribute("data-group-date")){ 
      return false;
    }
    
    // get date from the row text
    const d = getDateFromTSTableTitleRow(node.dataset.groupDate, startdate, enddate);
    // set to 1h because of DST
    day.setHours(1,0,0,0);
    return d.getTime() === day.getTime();
  });
  return pos;
}

/* return the date from title of of a row
** from a date range 
** 
** @param {string} dateTitleRow - date string from the row
** @param {Date} startdate - start date of the timesheet
** @param {Date} enddate - end date of the timesheet
** @returns {Date}
*/
function getDateFromTSTableTitleRow(dateTitleRow, startdate, enddate){
  const rowdate = dateTitleRow.split(' ');
  const d = rowdate[1];
  const m = getMonthFromString(rowdate[2]);

  // set to 1h because of DST
  startdate.setHours(1,0,0,0);
  enddate.setHours(1,0,0,0);

  let loop = new Date(startdate);
  // set to 1h because of DST
  loop.setHours(1,0,0,0);
  while(loop <= enddate){
    if(loop.getDate() == d && loop.getMonth() == m)
      return loop;

    let nextday = loop.setDate(loop.getDate() +1);
    loop = new Date(nextday);
    // set to 1h because of DST
    loop.setHours(1,0,0,0);
  }
}

/* return a total row given the title of this row,
** the counters data to insert and the number
** of empty columns to create before the data
** 
** @param {string} title - title of the row
** @param {string} counters - counters data
** @param {string} initialNbOfColumns - number of columns before the extension changed
** @returns {Element} HTML element
*/
function createTotalRow(titleRow, counters, initialNbOfColumns){

  const tr = document.createElement("tr");
  tr.classList.add("c-table__group","m-header", "m-fixed");

  // add title cell
  const titleCell = createRowTitleCell(titleRow);
  tr.append(titleCell);

  // add empty cells
  for (let index = 0; index < initialNbOfColumns; index++) {
    const emptyCell = createTotalCounterCell("");
    tr.append(emptyCell);
  }

  // add total cells
  counters.forEach(cnt => {
    const cntCell = createTotalCounterCell(cnt.formatted_value);
    tr.append(cntCell);
  });

  // add spacer cell
  const spacerCell = new createSpacerCell();
  tr.append(spacerCell);

  return tr;
}

/* insert counter names to the table header
** 
** @param {Array} counters - list of counters from API to add
** @param {Element} tsFormTableHeaderTr - header of the timesheet table
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {void}
*/
function addCountersToTableHeader(counters, tsFormTableHeaderTr, isDebugModeEnabled) {
  if (!tsFormTableHeaderTr) return;

  if (isDebugModeEnabled) {
    console.log("-- function addCountersToTableHeader")
    console.log("@param counters");
    console.log(counters);
    console.log("@param tsFormTableHeaderTr");
    console.log(tsFormTableHeaderTr);
  }

  const emptyCell = tsFormTableHeaderTr.lastChild;
  tsFormTableHeaderTr.removeChild(emptyCell);

  if (isDebugModeEnabled) {
    console.log("tsFormTableHeader");
    console.log(tsFormTableHeaderTr);
  }

  counters.forEach((cnt) => {

    const div0 = document.createElement("div");
    div0.textContent = cnt;
    div0.className = "c-table__header-title";

    const div1 = document.createElement("div");
    div1.className = "c-table__header-controls-wrapper";
    div1.append(div0);

    const headerCell = document.createElement("th");
    headerCell.className = "c-table__desktop-view";
    headerCell.title = cnt;
    headerCell.append(div1);

    tsFormTableHeaderTr.append(headerCell);
  });

  tsFormTableHeaderTr.appendChild(emptyCell);
}

/* insert counter daily values to the table body
** 
** @param {Array} counters - list of daily counters from API to add
** @param {NodeList} tsFormTableBody - body of the timesheet table
** @param {Date} startdate - start date of the timesheet
** @param {Date} enddate - end date of the timesheet
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {void}
*/
function addDailyCountersToTableBody(counters, tsFormTableBody, startdate, enddate, isDebugModeEnabled) {
  if (isDebugModeEnabled) {
    console.log("-- function addDailyCountersToTableBody")
    console.log("@param counters");
    console.log(counters);
    console.log("@param tsFormTableBody");
    console.log(tsFormTableBody);
  }

  // remove the filler last column
  if(tsFormTableBody.childNodes.length >0)
    removeAllEmptyLastCol(tsFormTableBody.childNodes);

  // add column
  tsFormTableBody.childNodes.forEach(tr => { addBodyColumn(tr, counters, startdate, enddate) });

  // add the filler last column
  if(tsFormTableBody.childNodes.length >0)
    addEmptyLastColToTrList(tsFormTableBody.childNodes);
}

/* insert counter daily values to the table body
** 
** @param {Element} tr - single row of the body
** @param {Array} counters - list of counters from API to add
** @param {Date} startdate - start date of the timesheet
** @param {Date} enddate - end date of the timesheet
** @returns {void}
*/
function addBodyColumn(tr, counters, startdate, enddate) {

  // don't touch the exception row
  if (tr.id.startsWith("exception_")) return;

  // get day from tr
  const day = getDateFromTSTableTitleRow(tr.dataset.groupDate, startdate, enddate);  

  // get counters of the day
  const dailyrecord = counters.filter(daily => {
    // set to 1h because of DST
    return new Date(daily.date + " 01:00:00:00").getTime() === day.getTime();
  }).map(m => m.items);
  
  if (dailyrecord.length === 0){ 
     return;
  }
  const dailycounters = dailyrecord[0].filter(c => c.type === 'COUNTER');

  dailycounters.forEach((cnt) => {
    const cell = (tr.id) ? createDailyEmptyCell() : createDailyCell(cnt);
    tr.append(cell);
  });
}

/* return the row title HTML element of a table cell
** 
** @param {string} title - title of the row
** @returns {Element} HTML element
*/
function createRowTitleCell(title) {
  const value = title;
  const classesForFirstDiv = ["c-summary-by-day__totals", "m-totals-padding-top", "u-medium-font"];

  const classesForSecondDiv = ["c-table__cell-wrapper","c-table__day-row"];
  const classesForTd = ["c-table__desktop-view", "c-table__fixed-cell", "c-table__control","m-fixed-left"];

  const cell = createCell(value, classesForFirstDiv, classesForSecondDiv, classesForTd);
  
  return cell;
}

/* return a cell with the total value for the timesheet table
** 
** @param {string} value - value of the cell
** @returns {Element} HTML element
*/
function createTotalCounterCell(value) {
  const classesForFirstDiv = ["c-summary-by-day__totals", "u-medium-font", "m-values", "m-totals-padding-bottom"];
  const classesForSecondDiv = ["c-table__cell-wrapper"];
  const classesForTd = ["c-table__desktop-view", "m-align-left"];

  const cell = createCell(value, classesForFirstDiv, classesForSecondDiv, classesForTd);
  
  return cell;
}

/* return the HTML element of a table cell
** with the counter data
** 
** @param {Counter} cnt - counter object from API
** @returns {Element} HTML element
*/
function createDailyCell(cnt) {
  const value = (cnt.value === 0) ? "-" : cnt.formatted_value;

  const classesForFirstDiv = ["u-medium-font"];
  if (cnt.value === 0) classesForFirstDiv.push("c-table__content-inactive");
  const classesForSecondDiv = ["c-table__cell-wrapper"];
  const classesForTd = ["c-table__desktop-view", "m-default-column", "m-minimize-width"];

  const cell = createCell(value, classesForFirstDiv, classesForSecondDiv, classesForTd);
  
  return cell;
}

/* return the HTML element of a table cell
** with no value to display
** 
** @param {number} trId - id of the HTML tr Element
** @param {Counter} cnt - counter object from API
** @returns {Element} HTML element
*/
function createDailyEmptyCell() {
  const classesForFirstDiv = ["u-medium-font"];
  const classesForSecondDiv = ["c-table__cell-wrapper"];
  const classesForTd = ["c-table__desktop-view", "m-default-column", "m-minimize-width"];

  const cell = createCell("", classesForFirstDiv, classesForSecondDiv, classesForTd);
  
  return cell;
}

/* return the HTML element of a table cell
** 
** @param {string} value - value of the cell
** @param {Array} classesForFirstDiv - css classes for the 1st div
** @param {Array} classesForSecondDiv - css classes for the 2nd div
** @param {Array} classesForTd - css classes for the td
** @returns {Element} HTML element
*/
function createCell(value, classesForFirstDiv, classesForSecondDiv, classesForTd) {
  const div0 = document.createElement("div");
  div0.textContent = value;
  classesForFirstDiv.forEach(c => div0.classList.add(c));
  
  const div1 = document.createElement("div");
  classesForSecondDiv.forEach(c => div1.classList.add(c));
  div1.append(div0);

  const cell = document.createElement("td");
  classesForTd.forEach(c => cell.classList.add(c));
  cell.append(div1);

  return cell;
}

/* return the last HTML element of the
** timesheet table cell
** 
** no param
** @returns {Element} HTML element
*/
function createSpacerCell(){
  const div = document.createElement("div");
  div.className = "c-table__cell-wrapper";

  const cell = document.createElement("td");
  cell.classList.add("c-table__desktop-view", "m-vertical-align-middle", "m-empty-last-col");
  cell.append(div);
  return cell;
}

/// --------------------------------
/// Common functions
/// --------------------------------

/* returns the number of displayed columns 
** on the Time entry's timesheet tab
** 
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {int}
*/
function getNumberOfDisplayedColumnsOnTimeEntry(isDebugModeEnabled) {
  if (isDebugModeEnabled) {
    console.log("-- function getNumberOfDisplayedColumnsOnTimeEntry")
  }

  const tsFormTableHeader = document.querySelectorAll('.c-timesheet-table-form > div > table > thead > tr > th:not(.hidden)');

  if (isDebugModeEnabled) {
    console.log("tsFormTableHeader");
    console.log(tsFormTableHeader);
  }

  return tsFormTableHeader.length;
}

/* apply a payload on the columns of the 
** Time entry's timesheet tab
** 
** @param {string} columnsList - list of column names separated by ;
** @param {function} payload - function with the tr Element as parameter
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {void}
*/
function applyOnTimeEntryColumns(columnsList, payload, isDebugModeEnabled) {
  if (isDebugModeEnabled) {
    console.log("-- function applyOnTimeEntryColumns")
    console.log("@param columnsList");
    console.log(columnsList);
    console.log("@param payload");
    console.log(payload);
  }

  const tsFormTableHeader = document.querySelectorAll('.c-timesheet-table-form > div > table > thead > tr > th');

  if (isDebugModeEnabled) {
    console.log("tsFormTableHeader");
    console.log(tsFormTableHeader);
  }

  const tsFormTableBody = document.querySelectorAll('.c-timesheet-table-form > div > table > tbody > tr');
  if (isDebugModeEnabled) {
    console.log("tsFormTableBody");
    console.log(tsFormTableBody);
  }

  columnsList.split(';').forEach(c =>
    applyOnSingleColumn(c,
      tsFormTableHeader,
      tsFormTableBody,
      payload,
      isDebugModeEnabled));
}

/* apply a payload on a single column of the 
** Time entry's timesheet tab
** 
** @param {string} columnName - name of the column
** @param {Element} tsFormTableHeaderTr - header of the timesheet table
** @param {NodeList} tsFormTableBody - body of the timesheet table
** @param {function} payload - function with the tr Element as parameter
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {void}
*/
function applyOnSingleColumn(columnName, tsFormTableHeader, tsFormTableBody, payload, isDebugModeEnabled) {
  if (isDebugModeEnabled) {
    console.log("-- function applyOnSingleColumn")
    console.log("@param columnName");
    console.log(columnName);
    console.log("@param tsFormTableHeader");
    console.log(tsFormTableHeader);
    console.log("@param tsFormTableBody");
    console.log(tsFormTableBody);
    console.log("@param payload");
    console.log(payload);
  }

  const columnPosition = findColumnPosition(tsFormTableHeader, columnName);

  if (isDebugModeEnabled) {
    console.log(`columnPosition=${columnPosition}`);
  }

  if (columnPosition < 0) return;

  applyOnColumnFromTrList(tsFormTableBody, columnPosition, payload);
  applyOnColumnFromTdList(tsFormTableHeader, columnPosition, payload);
}

/* apply a payload on a single row of the 
** Time entry's timesheet tab
** 
** @param {NodeList} trlist - body of the timesheet table
** @param {number} columnPosition - position of the column in the timesheet table
** @param {function} payload - function with the tr Element as parameter
** @returns {void}
*/
function applyOnColumnFromTrList(trlist, columnPosition, payload) {
  applyOnTrList(trlist, tr => {
    if(tr.id.startsWith("exception"))
      return;

    let position = columnPosition;

    if(Number.isInteger(Number.parseInt(tr.id))){
      position = columnPosition-1;
    }

    applyOnColumnFromTdList(tr.childNodes, position, payload);
  });
}

/* apply a payload on a cell of the Time entry's timesheet tab
** 
** @param {NodeList} trlist - row of the timesheet table
** @param {number} columnPosition - position of the column in the timesheet table
** @param {function} payload - function with the tr Element as parameter
** @returns {void}
*/
function applyOnColumnFromTdList(tdlist, columnPosition, payload) {
  const tdarray = Array.from(tdlist);
  console.log(tdarray);
  if (!tdarray[columnPosition]) return;

  payload(tdarray[columnPosition]);
}

/* return a position of a column in the 
** Time entry's timesheet tab
** 
** @param {NodeList} tdlist - row of the timesheet table
** @param {string} columnName - name of the column
** @returns {number} position of the column
*/
function findColumnPosition(tdlist, columnName) {
  const tdarray = Array.from(tdlist);
  const pos = tdarray.findIndex(node => node.title === columnName);
  return pos;
}

/* remove the last column of each tr Element
** 
** @param {NodeList} trlist - rows of the timesheet table
** @returns {void}
*/
function removeAllEmptyLastCol(trlist) {
  applyOnTrList(trlist, tr => {
    // don't touch the exception row
    if (tr.id.startsWith("exception_")) return;

    tr.removeChild(tr.lastChild);
  });
}

/* add the empty last column (spacer) to
** all the given rows
** 
** @param {NodeList} trlist - rows of the timesheet table
** @returns {Array} array of Dates
*/
function addEmptyLastColToTrList(trlist) {
  applyOnTrList(trlist, tr => {
    // don't touch the exception row
    if (tr.id.startsWith("exception_")) return;

    const cell = createSpacerCell();
    tr.append(cell);
  });
}

/* apply a payload on each row
** 
** @param {NodeList} trlist - rows of an HTML table
** @param {function} payload - function with the tr Element as parameter
** @param {string} dayName - name of day
** @returns {Array} array of Dates
*/
function applyOnTrList(trlist, payload) {
  trlist.forEach(tr => payload(tr));
}

/* return the day of the week of the
** given day
** 
** @param {string} dayname - name of day in English
** @returns {number}
*/
function getWeekdayFromString(dayname){
  const days = {sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
  const day = days[dayname.toLowerCase().substr(0,3)];
  return day;
}

/* return the month of the given day
** 
** @param {string} monthname - name of month in English or French
** @returns {number}
*/
function getMonthFromString(monthname){
  const months = {'jan.':0,'janv':0,
                  'feb.':1,'févr':1,
                  'mar.':2,'mars':2,
                  'apr.':3,'avr.':3,
                  'may.':4,'mai.':4,
                  'jun.':5,'juin':5,
                  'jul.':6,'juil':6,
                  'aug.':7,'août':7,
                  'sep.':8,'sept':8,
                  'oct.':9,
                  'nov.':10,
                  'dec.':11,'déc.':11};
  let monthshortname = monthname.toLowerCase().substr(0,4).trim();
  if(monthshortname.length === 3) monthshortname = monthshortname + ".";
  const month = months[monthshortname];
  return month;
}

/* return the language of the page 
** based on the save button label
** 
** @returns {string}
*/
function getLanguage(){
  const languages = {
    'en': 'Save',
    'fr': 'Enregistrer'
  };

  // default language is English
  let currentLanguage = "en";

  Object.keys(languages).forEach(key => {
    const sel = 'button[title][type="button"][aria-label="'+languages[key]+'"]';
    if (document.querySelector(sel) !== null){
      currentLanguage = key;
    }
  });

  return currentLanguage;
}

/* return the day of the week before the
** given day
** 
** @param {number} weekday - number of the day in the week
** @returns {number}
*/
function getWeekdayBefore(weekday){
  const weekdaybefore = (weekday - 1) < 0 ? 6 : (weekday - 1);
  return weekdaybefore;
}

/* return an array of dates between the two dates for the
** given day inclusive
** 
** @param {Date} start - date to start from
** @param {Date} end - date to end on
** @param {number} weekday - number of the day in the week
** @returns {Array} array of Dates
*/
function getWeekdaysBetweenDates(start, end, weekday) {
  let result = [];
  
  // Copy start date
  const current = new Date(start);

  // Shift to next of required days
  current.setDate(current.getDate() + (weekday - current.getDay() + 7) % 7);
  
  while (current <= end) {
    result.push(new Date(+current));
    current.setDate(current.getDate() + 7);
  }
  return result; 
}

/// --------------------------------
/// Cookies management
/// --------------------------------

/* return an array of session cookies
** from background script
** It returns the following cookies:
** LastLoginServer
** JSESSIONID
** XSRF-TOKEN
** LastLoginTIme
** lbSession
** _dd_s
** 
** @param {string} baseurl - base url of the page
** @returns {Array} array of cookies
*/
async function getCookies(baseurl) {

  const [result1, result2] = await Promise.all([chrome.runtime.sendMessage({
    action: 'COOKIES',
    type: 'GETALL'
  }),
  chrome.runtime.sendMessage({
    action: 'COOKIES',
    type: 'GET',
    url: baseurl,
    name: '_dd_s'
  })]);

  result1.cookies.push(result2.cookies);
  return result1.cookies;
}

/* return the session cookie string from
** the given array of cookies
** 
** @param {Array} cookies - array of session cookies
** @returns {string} session cookie
*/
function buildCookie(cookies) {
  // LastLoginServer
  const LastLoginServer = cookies.find((c) => c.name == "LastLoginServer");
  // JSESSIONID
  const JSESSIONID = cookies.find((c) => c.name == 'JSESSIONID');
  // XSRF-TOKEN
  const XSRFTOKEN = cookies.find((c) => c.name == 'XSRF-TOKEN');
  // LastLoginTime
  const LastLoginTime = cookies.find((c) => c.name == "LastLoginTime");
  // lbSession
  const lbSession = cookies.find((c) => c.name == "lbSession");
  // _dd_s= --> this is mandatory to connect
  const _dd_s = cookies.find((c) => c.name == "_dd_s");

  return `${_dd_s.name}=${_dd_s.value};${LastLoginServer.name}=${LastLoginServer.value};${JSESSIONID.name}=${JSESSIONID.value};${XSRFTOKEN.name}=${XSRFTOKEN.value};${LastLoginTime.name}=${LastLoginTime.value};${lbSession.name}=${lbSession.value}`;
}

/// --------------------------------
/// Get data from Ready UI API
/// --------------------------------

/* return the summarybyday object from the Ready Timesheet UI API
** 
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {Object} summary by day object from API
*/
async function getCountersFromSummaryByDay(isDebugModeEnabled) {

  const counters = await getDataFromTimesheetUIAPI("summary", isDebugModeEnabled);
  return counters;
}

/* return the counters object from the Ready Timesheet UI API
** 
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {Object} counters object from API
*/
async function getCountersData(isDebugModeEnabled) {
  const counters = await getDataFromTimesheetUIAPI("counters", isDebugModeEnabled);
  return counters;
}

/* return the timenetry object from the Ready Timesheet UI API
** 
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {Object} time entry object from API
*/
async function getTimeentryData(isDebugModeEnabled){
  const counters = await getDataFromTimesheetUIAPI("time", isDebugModeEnabled);
  return counters;
}

/* return the config object from the Ready Timesheet UI API
** 
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {Object} timesheet config object from API
*/
async function getTimesheetConfigData(isDebugModeEnabled) {
  const config = await getDataFromTimesheetUIAPI("config", isDebugModeEnabled);
  return config;
}

/* return the specified data object from the Ready Timesheet UI API
** 
** @param {string} name - data object name
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {Object} data object from API
*/
async function getDataFromTimesheetUIAPI(name, isDebugModeEnabled) {
  const qp = getQueryParameters(isDebugModeEnabled);
  const activesessionid = qp.activesessionid;
  const tsid = qp.tsid;

  const hostname = window.location.host;
  const baseurl = `https://${hostname}/`;

  const cookies = await getCookies(baseurl);
  if (isDebugModeEnabled) {
    console.log("get cookies");
    console.log(cookies);
  }

  const cookieSession = await buildCookie(cookies);
  if (isDebugModeEnabled) {
    console.log("cookie built");
    console.log(cookieSession);
  }
  const xsrfToken = cookies.find((c) => c.name == 'XSRF-TOKEN').value;

  const url = `https://${hostname}/ta/rest/ui/time/sheets/${tsid}/${name}?_=`;

  const data = await getDataFromReadyUIAPI(url, hostname, activesessionid, cookieSession, xsrfToken);
  return data;
}

// 
/* return the specified data object from the Ready UI API
** It is a generic function to call the Ready UI API
** 
** @param {string} url - url to call
** @param {string} hostname - Ready hostname
** @param {string} activesessionid - current session id
** @param {string} cookie - session cookie
** @param {string} xsrfToken - xsrf token
** @returns {Object} data object from API
*/
async function getDataFromReadyUIAPI(url, hostname, activesessionid, cookie, xsrfToken) {

  return await fetch(`${url}${new Date().getTime()}`, {
    "headers": {
      "Host": `${hostname}`,
      "accept": "application/json, text/javascript; q=0.01",
      "accept-language": "en-GB",
      "x-active-session-id": activesessionid,
      "x-requested-with": "XMLHttpRequest",
      "X-Xsrf-Token": xsrfToken,
      "Cookie": cookie,
      "Accept-Encoding": "gzip, deflate"
    },
    "referrer": `https://${hostname}/`,
    "referrerPolicy": "strict-origin",
    "body": null,
    "method": "GET",
    "mode": "cors",
    "credentials": "include"
  })
    .then((response) => {
      return response.body;
    })
    .then((body) => {
      const reader = body.getReader();

      return new ReadableStream({
        start(controller) {
          return pump();

          function pump() {
            return reader.read().then(({ done, value }) => {
              // When no more data needs to be consumed, close the stream
              if (done) {
                controller.close();
                return;
              }

              // Enqueue the next data chunk into our target stream
              controller.enqueue(value);
              return pump();
            });
          }
        },
      });
    })
    .then((stream) => new Response(stream))
    .then((response) => response.arrayBuffer())
    .then((array) => new TextDecoder().decode(array))
    .then((data) => JSON.parse(data))
    .then((counters) => counters);
}

/// --------------------------------
/// Extension options management
/// --------------------------------

/* return the specified option of the extension
** 
** @param {string} optionName - name of the option
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {any} option value
*/
async function getOption(optionName) {
  const option = await chrome.storage.local.get(optionName);
  return option[optionName];
}

/// --------------------------------
/// Query parameters
/// --------------------------------

/* return the query parameters tsId and ActiveSessionId
** 
** @param {bool} isDebugModeEnabled - extension parameter
** @returns {Object} tsId and ActiveSessionId
*/
function getQueryParameters(isDebugModeEnabled) {
  const qs = new URLSearchParams(document.URL);

  if (isDebugModeEnabled) {
    console.log(qs);
    console.log(qs.get('tsId'));
    console.log(qs.get('ActiveSessionId'));
  }

  const tsid = qs.get('tsId');

  const activesessionidraw = qs.get('ActiveSessionId');
  const activesessionid = activesessionidraw.split('#', 1)[0]

  return { 'tsid': tsid, 'activesessionid': activesessionid };
}