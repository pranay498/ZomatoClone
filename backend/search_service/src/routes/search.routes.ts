import { Router } from "express";
import { search, autocomplete, suggest } from "../controller/search.controller";

const router = Router();

// GET /search?q=&page=&limit=&restaurantId=&minPrice=&maxPrice=&isAvailable=
// Full-text search across menu items with filters and highlights
router.get("/", search);

// GET /search/autocomplete?q=
// Edge-ngram prefix search across menu items and restaurants (search-as-you-type)
router.get("/autocomplete", autocomplete);

// GET /search/suggest?q=
// Completion suggester — instant typeahead from the `suggest` field
router.get("/suggest", suggest);

export default router;
