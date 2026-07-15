import { Request, Response, NextFunction } from "express";
import { esClient, MENU_INDEX, RESTAURANT_INDEX } from "../config/elasticSearch";
import { asyncHandler } from "../utils/asyncHandler";

// ─────────────────────────────────────────────────────────────────────────────
// GET /search?q=...&page=1&limit=10&restaurantId=...&minPrice=...&maxPrice=...
// Full-text search across menu items (name, description, restaurantName)
// ─────────────────────────────────────────────────────────────────────────────
export const search = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const {
      q,
      page = "1",
      limit = "10",
      restaurantId,
      minPrice,
      maxPrice,
      isAvailable,
      lat,
      lng,
      radius = "10000", // Default: 10km (10000m)
    } = req.query as Record<string, string | undefined>;

    if (!q || q.trim() === "") {
      return res.status(200).json({ success: true, data: [], total: 0 });
    }

    const from = (parseInt(page) - 1) * parseInt(limit);
    const size = parseInt(limit);

    // Build optional filters
    const filters: any[] = [];
    if (restaurantId) {
      filters.push({ term: { restaurantId } });
    }
    if (isAvailable !== undefined) {
      filters.push({ term: { isAvailable: isAvailable === "true" } });
    }
    if (minPrice || maxPrice) {
      const range: any = {};
      if (minPrice) range.gte = parseFloat(minPrice);
      if (maxPrice) range.lte = parseFloat(maxPrice);
      filters.push({ range: { price: range } });
    }

    // Geo filter if coordinates are provided
    if (lat && lng) {
      filters.push({
        geo_distance: {
          distance: `${radius}m`,
          location: {
            lat: parseFloat(lat),
            lon: parseFloat(lng),
          },
        },
      });
    }

    const response = await esClient.search({
      index: MENU_INDEX,
      from,
      size,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: q.trim(),
                fields: [
                  "name^3",           // boost name matches
                  "restaurantName^2",  // boost restaurant name
                  "description",
                ],
                type: "best_fields",
                fuzziness: "AUTO",    // tolerate typos
              },
            },
          ],
          filter: filters,
        },
      },
      sort: [
        ...(lat && lng ? [{
          _geo_distance: {
            location: {
              lat: parseFloat(lat),
              lon: parseFloat(lng),
            },
            order: "asc",
            unit: "m",
            distance_type: "arc",
          } as any,
        }] : []),
        "_score",
      ],
      highlight: {
        fields: {
          name: {},
          description: {},
          restaurantName: {},
        },
      },
    });

    const hits = response.hits.hits;
    const total =
      typeof response.hits.total === "number"
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    const data = hits.map((hit) => ({
      ...(hit._source as object),
      _score: hit._score,
      _highlight: hit.highlight ?? {},
    }));

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: size,
      data,
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /search/autocomplete?q=...
// Edge-ngram prefix suggestions for search-as-you-type (searches both indices)
// ─────────────────────────────────────────────────────────────────────────────
export const autocomplete = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { q, lat, lng, radius = "10000" } = req.query as { q?: string; lat?: string; lng?: string; radius?: string };

    if (!q || q.trim() === "") {
      return res.status(200).json({ success: true, menuItems: [], restaurants: [] });
    }

    const menuFilters: any[] = [{ term: { isAvailable: true } }];
    const restaurantFilters: any[] = [];

    if (lat && lng) {
      const geoFilter = {
        geo_distance: {
          distance: `${radius}m`,
          location: {
            lat: parseFloat(lat),
            lon: parseFloat(lng),
          },
        },
      };
      menuFilters.push(geoFilter);
      restaurantFilters.push(geoFilter);
    }

    // Search both indices in parallel
    const [menuRes, restaurantRes] = await Promise.all([
      esClient.search({
        index: MENU_INDEX,
        size: 5,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: q.trim(),
                  fields: ["name", "restaurantName"],
                  analyzer: "search_analyzer",
                },
              },
            ],
            filter: menuFilters,
          },
        },
        _source: ["menuItemId", "restaurantId", "restaurantName", "name", "price", "image", "location"],
      }),
      esClient.search({
        index: RESTAURANT_INDEX,
        size: 5,
        query: {
          bool: {
            must: [
              {
                match: {
                  name: {
                    query: q.trim(),
                    analyzer: "search_analyzer",
                  },
                },
              },
            ],
            filter: restaurantFilters,
          },
        },
        _source: ["restaurantId", "name", "location"],
      }),
    ]);

    return res.status(200).json({
      success: true,
      menuItems: menuRes.hits.hits.map((h) => h._source),
      restaurants: restaurantRes.hits.hits.map((h) => h._source),
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /search/suggest?q=...
// Completion suggester — instant typeahead from the `suggest` field
// ─────────────────────────────────────────────────────────────────────────────
export const suggest = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { q } = req.query as { q?: string };

    if (!q || q.trim() === "") {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    const [menuRes, restaurantRes] = await Promise.all([
      esClient.search({
        index: MENU_INDEX,
        suggest: {
          menu_suggest: {
            prefix: q.trim(),
            completion: {
              field: "suggest",
              size: 5,
              skip_duplicates: true,
              fuzzy: { fuzziness: 1 },
            },
          },
        },
        _source: false,
      }),
      esClient.search({
        index: RESTAURANT_INDEX,
        suggest: {
          restaurant_suggest: {
            prefix: q.trim(),
            completion: {
              field: "suggest",
              size: 5,
              skip_duplicates: true,
              fuzzy: { fuzziness: 1 },
            },
          },
        },
        _source: false,
      }),
    ]);

    const menuSuggestions =
      (menuRes.suggest?.menu_suggest?.[0]?.options as any[])?.map(
        (opt: any) => opt.text
      ) ?? [];

    const restaurantSuggestions =
      (restaurantRes.suggest?.restaurant_suggest?.[0]?.options as any[])?.map(
        (opt: any) => opt.text
      ) ?? [];

    // Merge and deduplicate
    const suggestions = [
      ...new Set([...menuSuggestions, ...restaurantSuggestions]),
    ].slice(0, 8);

    return res.status(200).json({ success: true, suggestions });
  }
);
