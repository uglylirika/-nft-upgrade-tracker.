
const express = require("express");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Raw } = require("telegram/events");

const app = express();
app.use(express.json());

let client;
let mtprotoStatus = "Not connected";

app.get("/", (req, res) => {
  res.json({
    service: "NFT Upgrade Tracker",
    status: "Online",
    mtproto: mtprotoStatus
  });
});

async function startMTProto() {
  const apiId = Number(process.env.TG_API_ID);
  const apiHash = process.env.TG_API_HASH;
  const session = process.env.TG_SESSION;

  if (!apiId || !apiHash || !session) {
    console.log("MTProto credentials are not configured");
    return;
  }

  client = new TelegramClient(
    new StringSession(session),
    apiId,
    apiHash,
    { connectionRetries: 5 }
  );

  await client.connect();

  if (!(await client.checkAuthorization())) {
    throw new Error("Telegram session is not authorized");
  }

  mtprotoStatus = "Connected";
  console.log("MTProto connected");

  client.addEventHandler(async (update) => {
    try {
      const message = update.message;
      const action = message?.action;
      const actionName = action?.className || "";

      if (!actionName.includes("StarGift")) return;

      console.log("NFT gift event:", actionName);

      const upgraded =
        action?.upgraded === true ||
        actionName.includes("StarGiftUnique");

      if (!upgraded) return;

      const token = process.env.BOT_TOKEN;
      const chatId = process.env.NOTIFY_CHAT_ID;

      if (!token || !chatId) return;

      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "🎁 Обнаружено событие улучшения NFT-подарка!\n" +
              "Тип события: " + actionName
          })
        }
      );
    } catch (error) {
      console.error("Event error:", error.message);
    }
  }, new Raw({}));
}

app.listen(process.env.PORT || 3000, () => {
  console.log("Tracker server started");
  startMTProto().catch((error) => {
    mtprotoStatus = "Error";
    console.error("MTProto error:", error.message);
  });
});
