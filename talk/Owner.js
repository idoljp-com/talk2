/* Owner_3saka 用データ設定
   このファイルは Owner のデータソース設定だけを登録します。
   画面表示・CSV解析・投稿描画は index.html 側で共通処理します。 */
(() => {
  'use strict';
  const publishedSheetId = '2PACX-1vS0cL4KlJ-xit2MY_kzKxTa3tqem2wwIgiE8SRo_EvyBUVhpYIEY7xr09iramMAjN0R7AcI7Ds9VBWo';
  window.TALK_SOURCES = window.TALK_SOURCES || {};
  window.TALK_SOURCES.Owner = {
    csvUrl: `https://docs.google.com/spreadsheets/d/e/${publishedSheetId}/pub?output=csv`,
    filterByGroup: false,
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
