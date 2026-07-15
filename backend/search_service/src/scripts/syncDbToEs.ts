import "dotenv/config";
import mongoose from "mongoose";
import { connectDB, disconnectDB } from "../config/db";
import { elasticService } from "../services/elastic.service";
import { searchService } from "../services/search.service";
import { Restaurant as SearchRestaurant } from "../models/Restaurant";
import { MenuItem as SearchMenuItem } from "../models/MenuItems";

async function runSync() {
  console.log("🚀 Starting database synchronization to Elasticsearch...");

  try {
    // 1. Connect to SearchService MongoDB (default connection)
    await connectDB();

    // 2. Ensure ES indices exist
    await elasticService.createIndices();
    console.log("✅ Elasticsearch indices checked/created");

    // 3. Connect to Restaurant/RealTime service MongoDB
    const restaurantDbUri = "mongodb+srv://pranaynarain05_db_user:1234@cluster0.xykppaz.mongodb.net/RealTime";
    const restaurantConn = mongoose.createConnection(restaurantDbUri);

    // Wait for connection
    await new Promise((resolve, reject) => {
      restaurantConn.once("open", resolve);
      restaurantConn.once("error", reject);
    });
    console.log("✅ Connected to Restaurant service database");

    // Define transient schemas to read data
    const RestaurantModel = restaurantConn.model(
      "Restaurant",
      new mongoose.Schema({}, { strict: false, collection: "restaurants" })
    );
    const MenuItemModel = restaurantConn.model(
      "MenuItem",
      new mongoose.Schema({}, { strict: false, collection: "menuitems" })
    );

    // 4. Fetch all restaurants and menu items
    const restaurants = (await RestaurantModel.find({}).lean()) as any[];
    const menuItems = (await MenuItemModel.find({}).lean()) as any[];

    console.log(`📊 Found ${restaurants.length} restaurants and ${menuItems.length} menu items in Restaurant database.`);

    // 5. Index Restaurants in MongoDB and ES
    for (const rest of restaurants) {
      const restId = rest._id.toString();
      const restName = rest.name as string;

      console.log(`Syncing restaurant: ${restName} (${restId})`);

      // Sync to Search Service Local DB
      await SearchRestaurant.updateOne(
        { restaurantId: restId },
        { restaurantId: restId, name: restName },
        { upsert: true }
      );

      const restLoc = rest.autoLocation?.coordinates
        ? { lat: rest.autoLocation.coordinates[1], lon: rest.autoLocation.coordinates[0] }
        : null;

      // Sync to ES
      // @ts-ignore - access private helper or invoke custom logic
      await searchService.upsertInEs( "restaurants", restId, {
        restaurantId: restId,
        name: restName,
        suggest: { input: [restName] },
        ...(restLoc ? { location: restLoc } : {}),
      });
    }

    // 6. Index Menu Items in MongoDB and ES
    for (const item of menuItems) {
      const itemId = item._id.toString();
      const restId = item.restaurantId.toString();

      // Find the matching restaurant name
      const rest = restaurants.find((r) => r._id.toString() === restId);
      const restName = rest ? (rest.name as string) : "Unknown Restaurant";

      console.log(`Syncing menu item: ${item.name} for restaurant: ${restName}`);

      // Sync to Search Service Local DB
      await SearchMenuItem.updateOne(
        { menuItemId: itemId },
        {
          menuItemId: itemId,
          restaurantId: restId,
          restaurantName: restName,
          name: item.name,
          description: item.description || "",
          image: item.image || null,
          price: item.price,
          isAvailable: item.isAvailable !== false,
        },
        { upsert: true }
      );

      const restLoc = rest?.autoLocation?.coordinates
        ? { lat: rest.autoLocation.coordinates[1], lon: rest.autoLocation.coordinates[0] }
        : null;

      // Sync to ES
      // @ts-ignore
      await searchService.upsertInEs( "menu_items", itemId, {
        menuItemId: itemId,
        restaurantId: restId,
        restaurantName: restName,
        name: item.name,
        description: item.description || "",
        price: item.price,
        image: item.image || null,
        isAvailable: item.isAvailable !== false,
        suggest: { input: [item.name, restName] },
        ...(restLoc ? { location: restLoc } : {}),
      });
    }

    console.log("🎉 Reindexing and synchronization completed successfully!");

    // Close connections
    await restaurantConn.close();
    await disconnectDB();
  } catch (error) {
    console.error("❌ Synchronization failed:", error);
    process.exit(1);
  }
}

runSync();
