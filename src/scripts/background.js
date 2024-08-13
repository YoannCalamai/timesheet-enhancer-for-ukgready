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

chrome.runtime.onMessage.addListener(handleMessage);

function handleMessage(message, sender, sendResponse) {
    setTimeout(() => {
        switch (message.action) {
            case 'COOKIES':
                switch (message.type) {
                    case 'GETALL':
                        chrome.cookies.getAll({  },
                        function (theCookies) {
                            cookies = theCookies
                            sendResponse({ cookies: cookies })
                        });
                        break;
                    case 'GET':
                        chrome.cookies.get({ url: message.url, name: message.name },
                        function (theCookies) {
                            cookies = theCookies
                            sendResponse({ cookies: cookies })
                        });
                        break;
                    default:
 					    sendResponse({ message: 'Invalid type' });
 					    break;
                }
                break;
            default:
                sendResponse({ message: 'Invalid action' });
                break;
        }
    }, 1000);
    return true;
  }