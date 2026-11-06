/* =========================================================
 * Internet.js
 * Internet用スプレッドシート設定
 * ======================================================= */

(() => {
  'use strict';

  const INTERNET_SHEET_ID =
    '2PACX-1vTfLQRvus5Misi0An0YiOZNb9Mb2DFnuoBHseWBSnDJS0j1m-v4dWziIt84j00lw1RomYU9i-MqKuWv';

  window.TALK_SOURCES = window.TALK_SOURCES || {};
  window.TALK_SOURCES.Internet = {
    name: 'Internet',
    sheetId: INTERNET_SHEET_ID,
    filterGroup: true
  };
})();
