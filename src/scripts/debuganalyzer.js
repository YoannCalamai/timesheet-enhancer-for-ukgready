/** 
** Timesheet Enhancer for UKG Ready is a chrome extension to add some
** extra options to the Timesheet of the product UKG Ready.
** UKG Ready is a product from UKG <https://www.ukg.com>
** Copyright (C) 2024 Yoann Calamai
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

/*
** Load JSON into the table
*/
function submitJson() {
    const jsonInput = document.getElementById('txtJsonInput').value;
    try {
        const jsonData = JSON.parse(jsonInput);
        loadTableData(jsonData);
        document.getElementById('filterSection').style.display = 'block';
        document.getElementById('tableSection').style.display = 'block';
    } catch (error) {
        alert('Erreur de parsing JSON : ' + error.message);
    }
}
/*
** Load JSON into the table
*/
function loadTableData(jsonData) {
    const tbody = document.getElementById('tableBody');
    const thead = document.getElementById('ruleTable').querySelector('thead tr');
    const dateFilterSelect = document.getElementById('dateFilterSelect');
    const tfoot = document.getElementById('tableFooter');
    const threshold = parseInt(document.getElementById('threshold').value) || 100;

    // Empty the html object dynamically filled
    tbody.innerHTML = '';
    thead.innerHTML = '<tr><th>Rules</th></tr>'; // Updated header
    dateFilterSelect.innerHTML = '<option value="">Filter by date</option>';
    tfoot.innerHTML = '';

    // Get and sort dates
    const allDayData = Object.values(jsonData).map(item => item.dayData);
    const dates = Array.from(new Set(allDayData.flatMap(Object.keys))).sort((a, b) => new Date(a) - new Date(b));

    // Create date columns
    dates.forEach(date => {
        const th = document.createElement('th');
        th.textContent = date;
        thead.appendChild(th);

        // Add the date to the dropdown filter
        const option = document.createElement('option');
        option.value = date;
        option.textContent = date;
        dateFilterSelect.appendChild(option);
    });

    // Add total header
    const totalth = document.createElement('th');
    totalth.textContent = 'Total';
    thead.appendChild(totalth);

    // Init duration totals
    const totalsByDay = new Array(dates.length).fill(0);
    let totalDuration = 0;

    // Add the rules
    for (const [key, value] of Object.entries(jsonData)) {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${key.split(':')[0]}<br>${key.split(':')[1]}</td>`;

        let ruleTotal = 0;

        dates.forEach((date, index) => {
            const duration = value.dayData[date] ? value.dayData[date].durationTotals : 0;
            const changedCounters = value.dayData[date] ? value.dayData[date].changedCounters : [];
            const cell = document.createElement('td');
            const countersToDisplay = changedCounters.map(cnt => `${cnt.counterName}<br><span class="counter-value">${cnt.type === 1 ? convertMsToTime(cnt.oldValue) : cnt.oldValue} -> ${cnt.type === 1 ? convertMsToTime(cnt.newValue) : cnt.newValue}</span>`);
            const displayedDuration = duration > 0 ? `<span class="rule-duration">${duration}ms</span>` : "";
            cell.innerHTML = `${countersToDisplay.join("<br>----------------<br>")}<br>${displayedDuration}`;

            // Color the cell if duration > threshold
            if (duration > threshold) {
                cell.classList.add('high-duration');
            }

            row.appendChild(cell);
            totalsByDay[index] += duration;
            ruleTotal += duration;
        });

        // Add rule total to the row
        const totbyrulecell = document.createElement('td');
        totbyrulecell.textContent = `${ruleTotal / 1000}s`;
        if (ruleTotal > threshold) {
            totbyrulecell.classList.add('high-duration');
        } else {
            totbyrulecell.classList.add('total-row');
        }
        row.appendChild(totbyrulecell)
        tbody.appendChild(row);
        totalDuration += ruleTotal;
    }

    const totalRow = document.createElement('tr');
    totalRow.classList.add('total-row');
    totalRow.innerHTML = '<td>Total Duration</td>';

    totalsByDay.forEach(total => {
        const totbydaycell = document.createElement('td');
        totbydaycell.textContent = `${total / 1000}s`;
        if (total > threshold) {
            totbydaycell.classList.add('high-duration');
        }
        totalRow.appendChild(totbydaycell)
    });

    totalRow.innerHTML += `<td>${totalDuration / 1000}s</td>`;

    tfoot.appendChild(totalRow);
}


/*
** Filter the table
*/
function filterTable() {
    const filterValue = document.getElementById('filterInput').value.toLowerCase();
    const dateFilterValue = document.getElementById('dateFilterSelect').value;

    const rows = document.querySelectorAll('#tableBody tr');
    const dateCells = Array.from(document.querySelectorAll('#ruleTable th')).slice(1);

    // Réinitialiser l'en-tête pour toutes les dates
    dateCells.forEach(th => th.style.display = '');

    // Afficher toutes les lignes au départ
    rows.forEach(row => {
        row.style.display = ''; // Afficher toutes les lignes au départ

        const type = row.cells[0].textContent.toLowerCase();
        const cells = Array.from(row.cells).slice(1); // Ignorer la première cellule (type)

        // Vérifier si la date est filtrée
        const dateMatch = dateFilterValue ? dateCells.findIndex(th => th.textContent === dateFilterValue) : -1;

        if (dateFilterValue) {
            // Masquer toutes les cellules sauf celle qui correspond à la date sélectionnée
            cells.forEach((cell, index) => {
                if (index === dateMatch) {
                    cell.style.display = ''; // Afficher la cellule correspondante
                } else {
                    cell.style.display = 'none'; // Masquer les autres cellules
                }
            });
            // Masquer toutes les autres en-têtes sauf celle correspondant à la date filtrée
            dateCells.forEach((th, index) => {
                th.style.display = index === dateMatch ? '' : 'none';
            });
        } else {
            // Afficher toutes les cellules
            cells.forEach(cell => {
                cell.style.display = '';
            });
        }

        // Masquer la ligne si le type ne correspond pas au filtre
        row.style.display = type.includes(filterValue) ? '' : 'none'; // Filtrer par type
    });
}

function convertMsToTime(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.abs(totalMinutes % 60);

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}`;
}


// Add event listeners
document.getElementById('filterInput').addEventListener('input', filterTable);
document.getElementById('dateFilterSelect').addEventListener('change', filterTable);
document.getElementById('btnSubmitJson').addEventListener('click', submitJson);
document.getElementById('txtJsonInput').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        submitJson();
        event.preventDefault(); // Prevent default form submission
    }
});

// Focus on txtJsonInput
document.getElementById('txtJsonInput').focus();

// Back to Top btn
const backToTopButton = document.getElementById('backToTop');

window.onscroll = function () {
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        backToTopButton.style.display = "block";
    } else {
        backToTopButton.style.display = "none";
    }
};

// Scroll to top when the button is clicked
backToTopButton.onclick = function () {
    // For Safari
    document.body.scrollTop = 0;
    // For Chrome, Firefox, IE, and Opera
    document.documentElement.scrollTop = 0;
};
