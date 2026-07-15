import {esClient, MENU_INDEX, RESTAURANT_INDEX,} from "../config/elasticSearch";

export class ElasticService {
  async createIndices() {
    await this.createRestaurantIndex();
    await this.createMenuIndex();
  }

  private async createRestaurantIndex() {
    const exists = await esClient.indices.exists({
      index: RESTAURANT_INDEX,
    });

    if (exists) return;

    await esClient.indices.create({
      index: RESTAURANT_INDEX,

      settings: {
        analysis: {
          tokenizer: {
            autocomplete_tokenizer: {
              type: "edge_ngram",
              min_gram: 2,
              max_gram: 20,
              token_chars: ["letter", "digit"],
            },
          },

          analyzer: {
            autocomplete_analyzer: {
              type: "custom",
              tokenizer: "autocomplete_tokenizer",
              filter: ["lowercase"],
            },

            search_analyzer: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase"],
            },
          },
        },
      },

      mappings: {
        properties: {
          restaurantId: {
            type: "keyword",
          },

          name: {
            type: "text",
            analyzer: "autocomplete_analyzer",
            search_analyzer: "search_analyzer",
          },

          suggest: {
            type: "completion",
          },

          location: {
            type: "geo_point",
          },
        },
      },
    });

    console.log("✅ Restaurant Index Created");
  }

  private async createMenuIndex() {
    const exists = await esClient.indices.exists({
      index: MENU_INDEX,
    });

    if (exists) return;

    await esClient.indices.create({
      index: MENU_INDEX,

      settings: {
        analysis: {
          tokenizer: {
            autocomplete_tokenizer: {
              type: "edge_ngram",
              min_gram: 2,
              max_gram: 20,
              token_chars: ["letter", "digit"],
            },
          },

          analyzer: {
            autocomplete_analyzer: {
              type: "custom",
              tokenizer: "autocomplete_tokenizer",
              filter: ["lowercase"],
            },

            search_analyzer: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase"],
            },
          },
        },
      },

      mappings: {
        properties: {
          menuItemId: {
            type: "keyword",
          },

          restaurantId: {
            type: "keyword",
          },

          restaurantName: {
            type: "text",
            analyzer: "autocomplete_analyzer",
            search_analyzer: "search_analyzer",
          },

          name: {
            type: "text",
            analyzer: "autocomplete_analyzer",
            search_analyzer: "search_analyzer",
          },

          description: {
            type: "text",
          },

          price: {
            type: "float",
          },

          image: {
            type: "keyword",
          },

          isAvailable: {
            type: "boolean",
          },

          suggest: {
            type: "completion",
          },

          location: {
            type: "geo_point",
          },
        },
      },
    });

    console.log("✅ Menu Index Created");
  }
}

export const elasticService = new ElasticService();