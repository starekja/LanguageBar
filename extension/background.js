chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-languagebar") {
    const { lbActive } = await chrome.storage.local.get("lbActive");
    const newState = lbActive === false ? true : (lbActive === true ? false : false);
    await chrome.storage.local.set({ lbActive: newState });
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      try { chrome.tabs.sendMessage(tab.id, { type: "lb-toggle", active: newState }); } catch (e) {}
    }
  }
});
