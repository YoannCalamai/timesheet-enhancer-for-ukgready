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


document.addEventListener('DOMContentLoaded', startup);

async function startup() {
	restoreOptions();
	activateSaveCheckboxEvents();
}


function activateSaveCheckboxEvents() {
	const chkOptions = document.querySelectorAll("fieldset > div > input[type=checkbox]");
	chkOptions.forEach(i => i.addEventListener("change", () => saveOptions()));
	const txtOptions = document.querySelectorAll("fieldset > div > input[type=text]");
	txtOptions.forEach(i => i.addEventListener("keyup", () => saveOptions()));
}

/// --------------------------------
/// save options functions
function saveOptions(){
	saveChkboxOptions();
	saveInputOptions()
}

function saveInputOptions(){
	const txtOptions = document.querySelectorAll("fieldset > div > input[type=text]");
	const values = [...txtOptions].map(o => objectify(o.name, o.value));
	console.log(values);
	values.forEach(v => chrome.storage.local.set(v));
	chrome.storage.local.get("HiddenColumns").then(p => console.log(p));
}

function saveChkboxOptions(){
	const chkOptions = document.querySelectorAll("fieldset > div > input[type=checkbox]");
	const values = [...chkOptions].map(o => objectify(o.name, o.checked));
	console.log(values);
	values.forEach(v => chrome.storage.local.set(v));
	chrome.storage.local.get("CountersInEntryTab").then(p => console.log(p));
	chrome.storage.local.get("DebugMode").then(p => console.log(p));
}

function objectify (key, value) {
	let obj = {}
	obj[key] = value
	return obj
}

/// --------------------------------
/// restore options functions
function restoreOptions(){
	restoreChkboxOptions();
	restoreInputOptions();
}

function restoreInputOptions(){
	const txtOptions = document.querySelectorAll("fieldset > div > input[type=text]");
	txtOptions.forEach(i => {
		console.log(i);
		chrome.storage.local.get(i.name)
							.then(p => { i.value = p[i.name] });
	});
}

function restoreChkboxOptions(){
	const chkOptions = document.querySelectorAll("fieldset > div > input[type=checkbox]");
	chkOptions.forEach(i => {
		chrome.storage.local.get(i.name)
							.then(p => { i.checked = p[i.name] });
	});
}