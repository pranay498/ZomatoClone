import { getChannel } from "./rabbitmq";

export const publishSearchEvent = async (type: string, data: any): Promise<void> => {
  try {
    const channel = getChannel();

    channel.sendToQueue( process.env.SEARCH_QUEUE!, Buffer.from(JSON.stringify({ type, data,})
      ),
      {
        persistent: true,
      }
    );

    console.log(`📤 Search Event Published: ${type}`);
  } catch (error) {
    console.error("❌ Failed to publish search event:", error);
    throw error;
  }
};