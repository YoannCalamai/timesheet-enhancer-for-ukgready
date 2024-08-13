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


document.querySelector('#btnOpenSettings').addEventListener('click', function () {
	if (chrome.runtime.openOptionsPage) {
		chrome.runtime.openOptionsPage();
	} else {
		window.open(chrome.runtime.getURL('options.html'));
	}
});