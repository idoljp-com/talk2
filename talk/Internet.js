/* Internet_各坂道 用データ設定
   乃木坂46・櫻坂46・日向坂46の3ルームで共通利用します。
   表示対象は index.html から渡された room のグループ値で絞り込みます。 */
(() => {
  'use strict';
  const publishedSheetId = '2PACX-1vTfLQRvus5Misi0An0YiOZNb9Mb2DFnuoBHseWBSnDJS0j1m-v4dWziIt84j00lw1RomYU9i-MqKuWv';
  window.TALK_SOURCES = window.TALK_SOURCES || {};
  window.TALK_SOURCES.Internet = {
    csvUrl: `https://docs.google.com/spreadsheets/d/e/${publishedSheetId}/pub?output=csv`,
    filterByGroup: true,
    columns: {
      date: ['日時','日付','timestamp'],
      from: ['from','投稿者','名前'],
      image: ['画像URL','画像 url','画像','image','imageurl'],
      group: ['グループ','group'],
      member: ['メンバー','member'],
      message: ['本文','メッセージ','テキスト','内容','message']
    }
  };
})();
