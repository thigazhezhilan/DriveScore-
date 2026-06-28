import { getRequestConfig } from "next-intl/server";

// Tamil pipeline paused 2026-06-27 — always serve English until Tamil is re-enabled.
// To restore: reinstate cookie-based locale reading (read NEXT_LOCALE cookie → "en"|"ta").
export default getRequestConfig(async () => {
  return {
    locale: "en",
    messages: (await import("../messages/en.json")).default,
  };
});
