/* EchoScribe — clicking the toolbar icon opens the full-page transcriber. */
chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({ url: chrome.runtime.getURL('transcribe.html') });
});
