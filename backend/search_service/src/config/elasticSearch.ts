import { Client } from "@elastic/elasticsearch";

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

export const MENU_INDEX = "menu_items";
export const RESTAURANT_INDEX = "restaurants";