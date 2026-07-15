import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { getSearchResults, SearchFilterParams } from "../services/api";
import { FiChevronLeft, FiChevronRight, FiFilter, FiSliders, FiX, FiCheck } from "react-icons/fi";
import { useApp } from "../Context/MainContext";

const SEARCH_PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }
  
  .search-page-root {
    font-family: 'DM Sans', sans-serif;
    background: linear-gradient(to bottom, #0d0a05 0%, #000000 100%);
    color: #f0e6cc;
    min-height: 100vh;
    padding-top: 100px; /* offset navbar */
    padding-bottom: 80px;
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
  }

  .search-card {
    background: linear-gradient(155deg, rgba(20,15,7,0.98) 0%, rgba(11,8,3,0.99) 100%);
    border: 1px solid rgba(212,175,100,0.12);
    border-radius: 6px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    animation: fadeIn 0.45s ease-out both;
  }

  .search-card:hover {
    border-color: rgba(212,175,100,0.45);
    transform: translateY(-4px);
    box-shadow: 0 12px 35px rgba(212, 175, 100, 0.12), 0 8px 20px rgba(0,0,0,0.7);
  }

  .search-card:hover .card-btn {
    background: #e8c14e !important;
    color: #0b0803 !important;
  }

  .search-card img {
    transition: transform 0.4s ease;
  }

  .search-card:hover img {
    transform: scale(1.04);
  }

  .filter-input {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(212, 175, 100, 0.2);
    color: #f0e6cc;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
  }

  .filter-input:focus {
    border-color: #d4af64;
    background: rgba(255, 255, 255, 0.07);
    box-shadow: 0 0 0 2px rgba(212, 175, 100, 0.15);
  }

  .checkbox-custom {
    position: relative;
    width: 20px;
    height: 20px;
    border: 1.5px solid rgba(212, 175, 100, 0.35);
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .checkbox-custom.checked {
    background: #d4af64;
    border-color: #d4af64;
  }

  .pagination-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    border: 1px solid rgba(212, 175, 100, 0.25);
    background: rgba(20, 15, 7, 0.6);
    color: #d4af64;
    font-weight: 500;
    transition: all 0.2s;
  }

  .pagination-btn:hover:not(:disabled) {
    background: #d4af64;
    color: #0b0803;
    border-color: #d4af64;
  }

  .pagination-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .sk-card {
    background: linear-gradient(155deg, rgba(20,15,7,0.9) 0%, rgba(11,8,3,0.9) 100%);
    border: 1px solid rgba(212,175,100,0.06);
    border-radius: 6px;
    height: 380px;
    overflow: hidden;
    animation: pulse 1.5s ease-in-out infinite;
  }
`;

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") || "";
  const { location } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 9;

  // Filter States
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilterParams>({});

  const abortRef = useRef<AbortController | null>(null);

  // Fetch results
  const fetchResults = useCallback(async (searchQuery: string, pageNum: number, filters: SearchFilterParams) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const payload: SearchFilterParams = {
        page: pageNum,
        limit,
        lat: location?.latitude ?? undefined,
        lng: location?.longitude ?? undefined,
        ...filters,
      };

      const res = await getSearchResults(searchQuery, payload, controller.signal);
      if (res.success) {
        setResults(res.data || []);
        setTotal(res.total || 0);
      } else {
        setError("Failed to retrieve search results.");
      }
    } catch (err: any) {
      if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
        console.error("Search fetch error:", err);
        setError("Something went wrong while fetching search results.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [location]);

  // Update query when params or applied filters change
  useEffect(() => {
    fetchResults(q, page, appliedFilters);
  }, [q, page, appliedFilters, fetchResults]);

  // Reset page to 1 when search query changes
  useEffect(() => {
    setPage(1);
  }, [q]);

  // Handle filter submit
  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    const newFilters: SearchFilterParams = {};
    if (minPrice) newFilters.minPrice = parseFloat(minPrice);
    if (maxPrice) newFilters.maxPrice = parseFloat(maxPrice);
    if (availableOnly) newFilters.isAvailable = true;

    setPage(1);
    setAppliedFilters(newFilters);
  };

  const handleClearFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setAvailableOnly(false);
    setPage(1);
    setAppliedFilters({});
  };

  // Helper: safe rendering of ES highlights
  const renderHighlight = (text: string, highlightArr?: string[]) => {
    const textWithEm = highlightArr && highlightArr.length > 0 ? highlightArr[0] : text;
    if (!textWithEm) return "";
    
    const parts = textWithEm.split(/(<\/?.+?>)/g);
    return parts.map((part, index) => {
      if (part === "<em>") return null;
      if (part === "</em>") return null;
      const isHighlighted = index > 0 && parts[index - 1] === "<em>";
      if (isHighlighted) {
        return (
          <span key={index} style={{ color: "#e8c14e", fontWeight: "600", textShadow: "0 0 6px rgba(232,193,78,0.2)" }}>
            {part}
          </span>
        );
      }
      if (part.startsWith("<") && part.endsWith(">")) return null;
      return part;
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="search-page-root">
      <style>{SEARCH_PAGE_CSS}</style>
      
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        
        {/* Breadcrumb / Back Navigation */}
        <button 
          onClick={() => navigate("/")}
          style={{ 
            background: "none", border: "none", color: "rgba(212,175,100,0.7)", 
            display: "flex", alignItems: "center", gap: 6, fontSize: 13, 
            cursor: "pointer", marginBottom: 24, padding: 0
          }}
        >
          <FiChevronLeft size={16} /> Back to Home
        </button>

        {/* Page Title & Search Metadata */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 400, color: "#f3ebdb" }}>
            Search Results
          </h1>
          <p style={{ fontSize: "14px", color: "rgba(200,175,130,0.6)", marginTop: 6 }}>
            {total > 0 
              ? `Found ${total} item${total > 1 ? "s" : ""} matching "${q}"`
              : q ? `No results for "${q}"` : "Enter a search term above"
            }
          </p>
        </div>

        {/* Main Content Layout */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }} className="md:flex-row">
          
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
            
            {/* ── Filters Sidebar ── */}
            <div style={{ 
              width: "100%", maxWidth: 280, 
              background: "linear-gradient(155deg, rgba(16,12,6,0.97) 0%, rgba(8,6,2,0.99) 100%)",
              border: "1px solid rgba(212,175,100,0.15)", borderRadius: 6, padding: 24,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <FiSliders style={{ color: "#d4af64" }} />
                <h3 style={{ fontSize: 16, fontWeight: 500, color: "#f0e6cc" }}>Refine Search</h3>
              </div>

              <form onSubmit={handleApplyFilters} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Price range */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "rgba(200,175,130,0.7)", display: "block", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Price Range (₹)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={minPrice} 
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="filter-input"
                      style={{ width: "50%" }}
                    />
                    <span style={{ color: "rgba(200,175,130,0.4)" }}>-</span>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={maxPrice} 
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="filter-input"
                      style={{ width: "50%" }}
                    />
                  </div>
                </div>

                {/* Available Only */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div 
                    onClick={() => setAvailableOnly(!availableOnly)}
                    className={`checkbox-custom ${availableOnly ? "checked" : ""}`}
                  >
                    {availableOnly && <FiCheck size={12} style={{ color: "#0b0803" }} />}
                  </div>
                  <span 
                    onClick={() => setAvailableOnly(!availableOnly)}
                    style={{ fontSize: 13, color: "#f0e6cc", cursor: "pointer", userSelect: "none" }}
                  >
                    Available Items Only
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  <button 
                    type="submit"
                    style={{ 
                      background: "#d4af64", color: "#0b0803", border: "none", 
                      borderRadius: 4, padding: "10px 16px", fontWeight: 600, 
                      fontSize: 13, cursor: "pointer", transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#e8c14e"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#d4af64"}
                  >
                    Apply Filters
                  </button>
                  
                  {(appliedFilters.minPrice || appliedFilters.maxPrice || appliedFilters.isAvailable) && (
                    <button 
                      type="button"
                      onClick={handleClearFilters}
                      style={{ 
                        background: "rgba(255,255,255,0.04)", color: "#f0e6cc", 
                        border: "1px solid rgba(212,175,100,0.15)", borderRadius: 4, 
                        padding: "8px 16px", fontWeight: 500, fontSize: 13, cursor: "pointer"
                      }}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* ── Results Display ── */}
            <div style={{ flex: 1, minWidth: 320 }}>
              {loading ? (
                // Skeletons
                <div className="results-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="sk-card" />
                  ))}
                </div>
              ) : error ? (
                // Error page state
                <div style={{ textAlign: "center", padding: "60px 24px", background: "rgba(255,0,0,0.02)", border: "1px dashed rgba(239,68,68,0.2)", borderRadius: 6 }}>
                  <p style={{ color: "#ef4444", fontSize: 16 }}>{error}</p>
                  <button 
                    onClick={() => fetchResults(q, page, appliedFilters)}
                    style={{ marginTop: 16, background: "rgba(212,175,100,0.15)", border: "1px solid #d4af64", color: "#d4af64", padding: "8px 16px", borderRadius: 4, cursor: "pointer" }}
                  >
                    Try Again
                  </button>
                </div>
              ) : results.length === 0 ? (
                // Empty state
                <div style={{ 
                  textAlign: "center", padding: "80px 24px", 
                  background: "linear-gradient(155deg, rgba(20,15,7,0.4) 0%, rgba(11,8,3,0.4) 100%)",
                  border: "1px solid rgba(212,175,100,0.08)", borderRadius: 6
                }}>
                  <span style={{ fontSize: 48 }}>🍽️</span>
                  <h3 style={{ fontSize: 18, color: "#f3ebdb", marginTop: 18, fontWeight: 500 }}>No Culinary Delights Found</h3>
                  <p style={{ fontSize: 13, color: "rgba(200,175,130,0.5)", marginTop: 8, maxWidth: 360, marginInline: "auto" }}>
                    We couldn't find any dishes matching "{q}". Try checking your spelling or adjusting your filters.
                  </p>
                  <button 
                    onClick={handleClearFilters}
                    style={{ marginTop: 24, background: "rgba(212,175,100,0.12)", border: "1px solid rgba(212,175,100,0.3)", color: "#d4af64", padding: "8px 20px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                // Search Results Grid
                <>
                  <div className="results-grid">
                    {results.map((item, idx) => {
                      const hasHighlights = item._highlight;
                      return (
                        <div key={item.menuItemId} className="search-card" style={{ animationDelay: `${idx * 50}ms` }}>
                          
                          {/* Image */}
                          <div style={{ height: 170, overflow: "hidden", position: "relative", background: "rgba(212,175,100,0.03)" }}>
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }}
                              />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at center, rgba(212,175,100,0.08) 0%, rgba(0,0,0,0.4) 100%)" }}>
                                <span style={{ fontSize: 36, opacity: 0.25 }}>🍕</span>
                              </div>
                            )}
                            
                            {/* Availability Badge */}
                            <span style={{
                              position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 600, 
                              letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 2,
                              background: item.isAvailable ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)",
                              border: `1px solid ${item.isAvailable ? "rgba(74,222,128,0.3)" : "rgba(239,68,68,0.3)"}`,
                              color: item.isAvailable ? "#4ade80" : "#f87171",
                            }}>
                              {item.isAvailable ? "Available" : "Out of Stock"}
                            </span>
                          </div>

                          {/* Info */}
                          <div style={{ padding: "18px 20px" }}>
                            
                            {/* Category or tags */}
                            <p style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#d4af64", fontWeight: 600, marginBottom: 6 }}>
                              Dish
                            </p>

                            {/* Name */}
                            <h3 style={{ fontSize: 16, fontWeight: 500, color: "#f0e6cc", marginBottom: 4, lineHeight: 1.4 }}>
                              {renderHighlight(item.name, hasHighlights?.name)}
                            </h3>

                            {/* Restaurant Link */}
                            <Link 
                              to={`/restaurant/${item.restaurantId}`}
                              style={{ fontSize: 12, color: "rgba(200,175,130,0.6)", textDecoration: "none", display: "inline-block", marginBottom: 12 }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "#e8c14e"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "rgba(200,175,130,0.6)"}
                            >
                              by <span style={{ textDecoration: "underline", fontWeight: 500 }}>
                                {renderHighlight(item.restaurantName, hasHighlights?.restaurantName)}
                              </span>
                            </Link>

                            {/* Description */}
                            <p style={{ 
                              fontSize: 12, color: "rgba(200,175,130,0.45)", lineHeight: 1.5, marginBottom: 16,
                              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", height: 36
                            }}>
                              {renderHighlight(item.description, hasHighlights?.description)}
                            </p>

                            <div style={{ height: 1, background: "rgba(212,175,100,0.06)", marginBottom: 16 }} />

                            {/* Footer (Price + Button) */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: 16, fontWeight: 600, color: "#e8c14e" }}>
                                ₹{item.price}
                              </span>
                              
                              <button 
                                onClick={() => navigate(`/restaurant/${item.restaurantId}`)}
                                className="card-btn"
                                style={{ 
                                  background: "rgba(212,175,100,0.08)", border: "1px solid rgba(212,175,100,0.3)",
                                  color: "#d4af64", padding: "8px 14px", borderRadius: 4, fontSize: 11,
                                  fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease"
                                }}
                              >
                                View Restaurant
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 40 }}>
                      <button 
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="pagination-btn"
                      >
                        <FiChevronLeft size={18} />
                      </button>
                      
                      <span style={{ fontSize: 13, color: "rgba(200,175,130,0.6)" }}>
                        Page <span style={{ color: "#d4af64", fontWeight: 600 }}>{page}</span> of {totalPages}
                      </span>

                      <button 
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="pagination-btn"
                      >
                        <FiChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
