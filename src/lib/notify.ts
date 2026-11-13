/** Android Chrome only allows notifications through a service worker; desktop allows both. */
export async function notify(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: "/icon.svg", tag: "kp-low-stock" });
    else new Notification(title, { body, icon: "/icon.svg" });
  } catch {}
}
