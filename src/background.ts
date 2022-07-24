chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isSaveTarget(details)) {
      saveNicoURL(details);
    }
  },
  {
    urls: ["https://*.dmc.nico/*"],
  },
  []
);

function isSaveTarget(
  details: chrome.webRequest.WebRequestBodyDetails
): boolean {
  if (!(details.url.includes("dmc.nico") && details.method === "GET")) {
    return false;
  }
  const hlsTarget = details.url.includes("master.m3u8");
  const htmlTarget = details.type === "media";
  return hlsTarget || htmlTarget;
}

function saveNicoURL(details: chrome.webRequest.WebRequestBodyDetails) {
  console.log({ [`videoURL-${details.tabId}`]: details.url });
  chrome.storage.local.set({ [`videoURL-${details.tabId}`]: details.url });
}

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  chrome.tabs.query({ windowId: removeInfo.windowId }, (tabs) => {
    let removeTabs = tabs.slice();
    let keys: string[] = [`videoURL-${tabId}`];
    if (removeInfo.isWindowClosing) {
      keys = removeTabs
        .map((e) => e.id)
        .flatMap((e) => e ?? [])
        .map((e) => `videoURL-${e}`);
    }
    chrome.storage.local
      .remove(keys)
      .then(() => console.log("removed: ", keys));
  });
});

chrome.action.onClicked.addListener((tab) => {
  const tabId = tab.id!;
  chrome.tabs.query(
    {
      active: true,
      windowId: chrome.windows.WINDOW_ID_CURRENT,
    },
    (tabs) => {
      const currentTab = tabs.shift();
      if (!currentTab) {
        return;
      }

      // Youtube
      if (isYoutube(currentTab)) {
        sendYoutubeUrlToContent(currentTab);
        return;
      }

      // niconico
      if (isNiconico(currentTab)) {
        chrome.storage.local.get(`videoURL-${currentTab.id}`, (data) => {
          const url: string = data[`videoURL-${currentTab.id}`];

          console.log(url, currentTab.id);
          if (!url) {
            return;
          }
          chrome.tabs.sendMessage(
            tab.id!,
            { action: "GetVideoButtonClicked", url: url },
            () => {}
          );
        });
      }
    }
  );
});

function isYoutube(tab: chrome.tabs.Tab): boolean {
  const { url } = tab;
  if (!url) {
    return false;
  }
  return url.includes("https://www.youtube.com/watch");
}

function isNiconico(tab: chrome.tabs.Tab): boolean {
  const { url } = tab;
  if (!url) {
    return false;
  }
  const search = [
    "https://www.nicovideo.jp/watch/",
    "https://live.nicovideo.jp/watch/lv",
  ];
  return search.some((e) => url.includes(e));
}

function sendYoutubeUrlToContent(tab: chrome.tabs.Tab) {
  const { url } = tab;
  if (!(tab && url)) {
    return;
  }
  const params = new URL(url).searchParams;
  const videoId = params.get("v");
  const targetUrl = `https://youtu.be/${videoId}`;
  chrome.tabs.sendMessage(
    tab.id!,
    { action: "GetVideoButtonClicked", url: targetUrl },
    () => {}
  );
}
