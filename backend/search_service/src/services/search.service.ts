import { esClient, MENU_INDEX, RESTAURANT_INDEX } from "../config/elasticSearch";
import { MenuItem } from "../models/MenuItems";
import { Restaurant } from "../models/Restaurant";

// ─── Payload shapes (mirror what the publisher sends) ─────────────────────────

interface MenuItemCreatedPayload {
  restaurantId: string;
  restaurantName: string;
  menuItemId: string;
  name: string;
  description: string;
  image?: string;
  price: number;
  isAvailable?: boolean;
}

interface MenuItemUpdatedPayload {
  menuItemId: string;
  restaurantId?: string;
  restaurantName?: string;
  name?: string;
  description?: string;
  image?: string;
  price?: number;
  isAvailable?: boolean;
}

interface MenuItemToggledPayload {
  menuItemId: string;
  isAvailable: boolean;
}

interface MenuItemDeletedPayload {
  menuItemId: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class SearchService {
  // ── Public API (one method per event type) ──────────────────────────────────

  async createMenuItem(data: MenuItemCreatedPayload): Promise<void> {
    // 1. Upsert restaurant in MongoDB
    await Restaurant.updateOne(
      { restaurantId: data.restaurantId },
      { restaurantId: data.restaurantId, name: data.restaurantName },
      { upsert: true }
    );

    // 2. Upsert menu item in MongoDB
    await MenuItem.updateOne(
      { menuItemId: data.menuItemId },
      {
        menuItemId: data.menuItemId,
        restaurantId: data.restaurantId,
        restaurantName: data.restaurantName,
        name: data.name,
        description: data.description,
        image: data.image,
        price: data.price,
        isAvailable: data.isAvailable ?? true,
      },
      { upsert: true }
    );

    await this.upsertInEs(RESTAURANT_INDEX, String(data.restaurantId), {
      restaurantId: String(data.restaurantId),
      name: data.restaurantName,
      suggest: { input: [data.restaurantName] },
    });

    // 4. Upsert menu item in Elasticsearch
    await this.upsertInEs(MENU_INDEX, String(data.menuItemId), {
      menuItemId: String(data.menuItemId),
      restaurantId: String(data.restaurantId),
      restaurantName: data.restaurantName,
      name: data.name,
      description: data.description,
      price: data.price,
      image: data.image ?? null,
      isAvailable: data.isAvailable ?? true,
      suggest: { input: [data.name, data.restaurantName] },
    });

    console.log("✅ MENU_ITEM_CREATED synced to ES");
  }

  async updateMenuItem(data: MenuItemUpdatedPayload): Promise<void> {
    const mongoUpdate = {
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.image !== undefined && { image: data.image }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
    };

    await MenuItem.updateOne({ menuItemId: data.menuItemId }, mongoUpdate);

    const esDoc = {
      ...(data.name && {
        name: data.name,
        suggest: {
          input: [data.name, data.restaurantName].filter(Boolean),
        },
      }),
      ...(data.description && { description: data.description }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.image !== undefined && { image: data.image }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
    };

    await this.updateInEs(MENU_INDEX, String(data.menuItemId), esDoc);

    console.log("✅ MENU_ITEM_UPDATED synced to ES");
  }

  async toggleMenuItemAvailability(data: MenuItemToggledPayload): Promise<void> {
    await MenuItem.updateOne(
      { menuItemId: data.menuItemId },
      { isAvailable: data.isAvailable }
    );

    await this.updateInEs(MENU_INDEX, String(data.menuItemId), {
      isAvailable: data.isAvailable,
    });

    console.log("✅ MENU_ITEM_TOGGLED synced to ES");
  }

  async deleteMenuItem(data: MenuItemDeletedPayload): Promise<void> {
    await MenuItem.deleteOne({ menuItemId: data.menuItemId });

    try {
      await esClient.delete({ index: MENU_INDEX, id: String(data.menuItemId) });
    } catch (err: any) {
      if (err?.meta?.statusCode !== 404) throw err;
    }

    console.log("✅ MENU_ITEM_DELETED synced to ES");
  }

  private async upsertInEs( index: string, id: string, doc: Record<string, unknown> ): Promise<void> {
    await esClient.update({ index, id, doc, doc_as_upsert: true });
  }

  private async updateInEs(index: string,id: string,doc: Record<string, unknown> ): Promise<void> {
    await esClient.update({ index, id, doc });
  }
}

export const searchService = new SearchService();
