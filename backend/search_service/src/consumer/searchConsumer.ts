import { getChannel } from "../config/rabbitmq";
import { searchService } from "../services/search.service";

export const startSearchConsumer = async () => {
  const channel = getChannel();

  channel.consume(
    process.env.SEARCH_QUEUE!,
    async (msg) => {
      if (!msg) return;

      try {
        const { type, data } = JSON.parse(msg.content.toString());

        console.log("🔍 Search Event:", type, data);

        switch (type) {
          case "MENU_ITEM_CREATED":
            await searchService.createMenuItem(data);
            break;

          case "MENU_ITEM_UPDATED":
            await searchService.updateMenuItem(data);
            break;

          case "MENU_ITEM_TOGGLED":
            await searchService.toggleMenuItemAvailability(data);
            break;

          case "MENU_ITEM_DELETED":
            await searchService.deleteMenuItem(data);
            break;

          default:
            console.log("⚠️  Unknown Search Event:", type);
        }

        channel.ack(msg);
      } catch (err) {
        console.error("❌ Search consumer error:", err);
        channel.nack(msg, false, false);
      }
    },
    { noAck: false }
  );
};