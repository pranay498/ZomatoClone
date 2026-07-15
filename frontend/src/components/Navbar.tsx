import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../Context/MainContext";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiSearch, FiMenu, FiX, FiShoppingBag, FiChevronDown, FiHome } from "react-icons/fi";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { MdAccountCircle, MdLogout } from "react-icons/md";
import toast from "react-hot-toast";
import { useAutocomplete } from "../hooks/useAutocomplete";
import { AutocompleteResponse, AutocompleteRestaurant, AutocompleteMenuItem } from "../types";

// ── Search Dropdown — extracted OUTSIDE Navbar so React reuses the same
// component instance across renders (no unmount/remount on every keystroke)
interface SearchDropdownProps {
  autocompleteLoading: boolean;
  flatResults: Array<(AutocompleteRestaurant & { type: "restaurant" }) | (AutocompleteMenuItem & { type: "menuItem" })>;
  autocompleteData: AutocompleteResponse;
  activeIndex: number;
  searchQuery: string;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
  goToResult: (result: { type: "restaurant" | "menuItem"; restaurantId: string }) => void;
  handleSearch: () => void;
}

const SearchDropdown = ({
  autocompleteLoading,
  flatResults,
  autocompleteData,
  activeIndex,
  searchQuery,
  setActiveIndex,
  goToResult,
  handleSearch,
}: SearchDropdownProps) => (
  <div
    role="listbox"
    aria-label="Search suggestions"
    className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden max-h-96 overflow-y-auto z-50"
    style={{
      background: "#1c1c1c",
      border: "1px solid rgba(212,175,55,0.2)",
      boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
    }}
  >
    {autocompleteLoading && (
      <div className="px-4 py-3 text-xs" style={{ color: "#6b7280" }}>
        Searching…
      </div>
    )}

    {!autocompleteLoading && flatResults.length === 0 && (
      <div className="px-4 py-3 text-xs" style={{ color: "#6b7280" }}>
        No results for "{searchQuery}"
      </div>
    )}

    {autocompleteData.restaurants.length > 0 && (
      <div className="py-1.5">
        <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6b7280" }}>
          Restaurants
        </p>
        {autocompleteData.restaurants.map((r) => {
          const idx = flatResults.findIndex((f) => f.type === "restaurant" && f.restaurantId === r.restaurantId);
          const active = idx === activeIndex;
          return (
            <button
              key={r.restaurantId}
              role="option"
              aria-selected={active}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => goToResult({ type: "restaurant", ...r })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all duration-150"
              style={{
                color: "#d1d5db",
                background: active ? "rgba(212,175,55,0.09)" : "transparent",
              }}
            >
              <HiOutlineLocationMarker style={{ color: "#e8c14e" }} />
              {r.name}
            </button>
          );
        })}
      </div>
    )}

    {autocompleteData.menuItems.length > 0 && (
      <div
        className="py-1.5"
        style={{ borderTop: autocompleteData.restaurants.length ? "1px solid rgba(255,255,255,0.06)" : "none" }}
      >
        <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6b7280" }}>
          Dishes
        </p>
        {autocompleteData.menuItems.map((item) => {
          const idx = flatResults.findIndex((f) => f.type === "menuItem" && f.menuItemId === item.menuItemId);
          const active = idx === activeIndex;
          return (
            <button
              key={item.menuItemId}
              role="option"
              aria-selected={active}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => goToResult({ type: "menuItem", restaurantId: item.restaurantId })}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all duration-150"
              style={{
                color: "#d1d5db",
                background: active ? "rgba(212,175,55,0.09)" : "transparent",
              }}
            >
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate">{item.name}</p>
                <p className="text-xs truncate" style={{ color: "#6b7280" }}>{item.restaurantName}</p>
              </div>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: "#e8c14e" }}>
                ₹{item.price}
              </span>
            </button>
          );
        })}
      </div>
    )}

    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
    <button onClick={handleSearch} className="w-full px-4 py-2.5 text-xs font-bold text-left" style={{ color: "#e8c14e" }}>
      See all results for "{searchQuery}" →
    </button>
  </div>
);

const Navbar = () => {
  const { isAuth, user, setIsAuth, setUser, setToken, city, loadingLocation } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1); // keyboard-highlighted dropdown row

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null); // desktop dropdown outside-click
  const mobileSearchDropdownRef = useRef<HTMLDivElement>(null); // mobile dropdown outside-click

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/select-role";

  // live autocomplete results as the user types
  const { data: autocompleteData, loading: autocompleteLoading } = useAutocomplete(searchQuery);
  const showDropdown = searchQuery.trim().length >= 2;

  const flatResults = [
    ...autocompleteData.restaurants.map((r) => ({ type: "restaurant" as const, ...r })),
    ...autocompleteData.menuItems.map((m) => ({ type: "menuItem" as const, ...m })),
  ];

  // reset the highlighted row whenever results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [autocompleteData]);

  // Deepen shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close everything on route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node))
        setMobileMenuOpen(false);
      // Close search dropdown when clicking outside either search container
      const clickedInsideSearch =
        (searchDropdownRef.current && searchDropdownRef.current.contains(e.target as Node)) ||
        (mobileSearchDropdownRef.current && mobileSearchDropdownRef.current.contains(e.target as Node));
      if (!clickedInsideSearch) {
        setSearchQuery("");
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchInputRef.current?.focus(), 120);
    } else {
      setSearchQuery("");
    }
  }, [mobileSearchOpen]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileSearchOpen(false);
    }
  };

  // Stable goToResult ref used inside SearchDropdown and handleSearchKeyDown.
  // Moved above handleSearchKeyDown so it's declared before first referenced
  // in source order (cosmetic — closures already made this safe at runtime,
  // since handleSearchKeyDown only *calls* goToResultCb later, on a keydown
  // event, by which point this const is long since initialized).
  const goToResultCb = useCallback(
    (result: { type: "restaurant" | "menuItem"; restaurantId: string }) => {
      navigate(`/restaurant/${result.restaurantId}`);
      setSearchQuery("");
      setMobileSearchOpen(false);
      setActiveIndex(-1);
    },
    [navigate]
  );

  // Keyboard nav for the dropdown — arrows, enter, escape
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || flatResults.length === 0) {
      if (e.key === "Enter") handleSearch();
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % flatResults.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? flatResults.length - 1 : i - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flatResults.length) {
          goToResultCb(flatResults[activeIndex]);
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setSearchQuery("");
        setActiveIndex(-1);
        break;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setIsAuth(false);
    toast.success("Logged out successfully");
    setDropdownOpen(false);
    navigate("/login");
  };

  if (isAuthPage) return null;

  // ── Shared link hover style helpers ──
  const menuLinkBase: React.CSSProperties = { color: "#d1d5db" };
  const applyMenuHover = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.09)";
    (e.currentTarget as HTMLElement).style.color = "#e8c14e";
  };
  const removeMenuHover = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    (e.currentTarget as HTMLElement).style.background = "transparent";
    (e.currentTarget as HTMLElement).style.color = "#d1d5db";
  };

  const desktopLinks = [
    { to: "/", icon: <FiHome className="text-lg" />, label: "Home" },
    { to: "/account", icon: <MdAccountCircle className="text-lg" />, label: "My Account" },
    { to: "/orders", icon: <FiShoppingBag className="text-base" />, label: "My Orders" },
    ...(user?.role === "seller"
      ? [{ to: "/restaurant", icon: <span className="text-base">🍽️</span>, label: "My Restaurant" }]
      : []),
    ...(user?.role === "admin"
      ? [{ to: "/admin", icon: <span className="text-base">🛡️</span>, label: "Admin Panel" }]
      : []),
  ];

  // SearchDropdown is defined OUTSIDE this component (above Navbar) to avoid
  // React unmounting+remounting it on every keystroke due to new function references.

  return (
    <nav
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: "linear-gradient(135deg, #181818 0%, #262626 55%, #181818 100%)",
        borderBottom: "1px solid rgba(212,175,55,0.22)",
        boxShadow: scrolled
          ? "0 8px 32px rgba(0,0,0,0.65)"
          : "0 2px 12px rgba(0,0,0,0.4)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">

          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{
                background: "linear-gradient(135deg, #f97316, #dc2626)",
                boxShadow: "0 0 18px rgba(249,115,22,0.4)",
              }}
            >
              <span className="text-xl select-none">🍅</span>
            </div>
            <div className="hidden sm:block leading-tight">
              <p
                className="text-xl font-extrabold tracking-wide"
                style={{
                  color: "#e8c14e",
                  textShadow: "0 0 20px rgba(232,193,78,0.3)",
                }}
              >
                Zomato
              </p>
              <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: "#6b7280" }}>
                Eat what makes you happy
              </p>
            </div>
          </Link>

          {/* ── Desktop Search Bar ── */}
          <div className="hidden md:block flex-1 max-w-lg relative" ref={searchDropdownRef}>
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(212,175,55,0.28)",
              }}
            >
              <FiSearch className="text-base flex-shrink-0" style={{ color: "#e8c14e" }} />
              <input
                type="text"
                placeholder="Search restaurants, cuisines, dishes…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={(e) => {
                  const wrapper = e.currentTarget.closest("div") as HTMLElement | null;
                  if (wrapper) wrapper.style.border = "1.5px solid rgba(212,175,55,0.7)";
                }}
                onBlur={(e) => {
                  const wrapper = e.currentTarget.closest("div") as HTMLElement | null;
                  if (wrapper) wrapper.style.border = "1.5px solid rgba(212,175,55,0.28)";
                }}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "#f3f4f6" }}
                aria-label="Search"
                aria-autocomplete="list"
                aria-controls="search-dropdown"
                aria-expanded={showDropdown}
              />
              {searchQuery && (
                <>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="transition-colors"
                    style={{ color: "#6b7280" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#d1d5db")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#6b7280")}
                    aria-label="Clear search"
                  >
                    <FiX />
                  </button>
                  <button
                    onClick={handleSearch}
                    className="text-xs font-bold px-3 py-1 rounded-full transition-opacity hover:opacity-90"
                    style={{
                      background: "linear-gradient(135deg, #f97316, #dc2626)",
                      color: "#fff",
                    }}
                  >
                    Go
                  </button>
                </>
              )}
            </div>
            {showDropdown && (
              <SearchDropdown
                autocompleteLoading={autocompleteLoading}
                flatResults={flatResults}
                autocompleteData={autocompleteData}
                activeIndex={activeIndex}
                searchQuery={searchQuery}
                setActiveIndex={setActiveIndex}
                goToResult={goToResultCb}
                handleSearch={handleSearch}
              />
            )}
          </div>

          {/* ── Right Controls ── */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Location — xl+ */}
            <div
              className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-full cursor-pointer select-none transition-all duration-200"
              style={{ border: "1px solid rgba(212,175,55,0.18)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.border = "1px solid rgba(212,175,55,0.5)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.border = "1px solid rgba(212,175,55,0.18)")
              }
            >
              <HiOutlineLocationMarker
                className={`text-base ${loadingLocation ? "animate-pulse" : ""}`}
                style={{ color: "#e8c14e" }}
              />
              <span className="text-xs font-medium whitespace-nowrap" style={{ color: "#9ca3af" }}>
                {loadingLocation ? "Detecting…" : city?.name || "Meerut"}
              </span>
            </div>

            {/* Mobile Search Toggle */}
            <button
              onClick={() => {
                setMobileSearchOpen((p) => !p);
                setMobileMenuOpen(false);
              }}
              className="md:hidden p-2.5 rounded-full transition-all"
              style={{ color: "#e8c14e" }}
              aria-label="Toggle search"
            >
              {mobileSearchOpen ? <FiX className="text-xl" /> : <FiSearch className="text-xl" />}
            </button>

            {isAuth ? (
              <>
                {/* Orders shortcut — sm+ */}
                <Link
                  to="/orders"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all duration-200"
                  style={{ color: "#9ca3af", border: "1px solid rgba(255,255,255,0.07)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#e8c14e";
                    e.currentTarget.style.border = "1px solid rgba(212,175,55,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#9ca3af";
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)";
                  }}
                >
                  <FiShoppingBag className="text-base" />
                  <span className="hidden lg:inline">Orders</span>
                </Link>

                {/* ── Desktop Account Dropdown ── */}
                <div className="relative hidden sm:block" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((p) => !p)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200"
                    style={{
                      background: dropdownOpen
                        ? "rgba(232,193,78,0.14)"
                        : "rgba(255,255,255,0.05)",
                      border: "1.5px solid rgba(212,175,55,0.4)",
                      color: "#e8c14e",
                    }}
                  >
                    <MdAccountCircle className="text-lg" />
                    <span className="max-w-[88px] truncate hidden sm:inline">
                      {user?.firstName || "Account"}
                    </span>
                    <FiChevronDown
                      className={`text-xs transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-3 w-60 rounded-2xl overflow-hidden"
                      style={{
                        background: "#1c1c1c",
                        border: "1px solid rgba(212,175,55,0.2)",
                        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
                      }}
                    >
                      {/* User info header */}
                      <div
                        className="px-5 py-4"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(249,115,22,0.07))",
                          borderBottom: "1px solid rgba(212,175,55,0.13)",
                        }}
                      >
                        <p className="text-sm font-bold" style={{ color: "#f3f4f6" }}>
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "#6b7280" }}>
                          {user?.email}
                        </p>
                        {user?.role && (
                          <span
                            className="inline-block mt-2 px-2.5 py-0.5 text-xs font-bold rounded-full capitalize"
                            style={{
                              background: "linear-gradient(135deg, #f97316, #dc2626)",
                              color: "#fff",
                            }}
                          >
                            {user.role}
                          </span>
                        )}
                      </div>

                      {/* Nav links */}
                      <div className="py-1.5">
                        {desktopLinks.map(({ to, icon, label }) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150"
                            style={menuLinkBase}
                            onMouseEnter={applyMenuHover}
                            onMouseLeave={removeMenuHover}
                          >
                            <span style={{ color: "#e8c14e" }}>{icon}</span>
                            {label}
                          </Link>
                        ))}
                      </div>

                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-150"
                        style={{ color: "#f87171" }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            "rgba(248,113,113,0.08)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "transparent")
                        }
                      >
                        <MdLogout className="text-lg" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Mobile Hamburger ── */}
                <div className="relative sm:hidden" ref={mobileMenuRef}>
                  <button
                    onClick={() => {
                      setMobileMenuOpen((p) => !p);
                      setMobileSearchOpen(false);
                    }}
                    className="p-2.5 rounded-full transition-all"
                    style={{ color: "#e8c14e" }}
                    aria-label="Toggle menu"
                  >
                    {mobileMenuOpen ? (
                      <FiX className="text-xl" />
                    ) : (
                      <FiMenu className="text-xl" />
                    )}
                  </button>

                  {mobileMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden"
                      style={{
                        background: "#1c1c1c",
                        border: "1px solid rgba(212,175,55,0.2)",
                        boxShadow: "0 16px 48px rgba(0,0,0,0.75)",
                      }}
                    >
                      <div
                        className="px-4 py-4"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(249,115,22,0.07))",
                          borderBottom: "1px solid rgba(212,175,55,0.13)",
                        }}
                      >
                        <p className="text-sm font-bold" style={{ color: "#f3f4f6" }}>
                          {user?.firstName}
                        </p>
                        <p className="text-xs mt-0.5 break-words" style={{ color: "#6b7280" }}>
                          {user?.email}
                        </p>
                        {user?.role && (
                          <span
                            className="inline-block mt-2 px-2.5 py-0.5 text-xs font-bold rounded-full capitalize"
                            style={{
                              background: "linear-gradient(135deg, #f97316, #dc2626)",
                              color: "#fff",
                            }}
                          >
                            {user.role}
                          </span>
                        )}
                      </div>

                      <div className="py-1.5">
                        {desktopLinks.map(({ to, icon, label }) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm transition-all duration-150"
                            style={menuLinkBase}
                            onMouseEnter={applyMenuHover}
                            onMouseLeave={removeMenuHover}
                          >
                            <span style={{ color: "#e8c14e" }}>{icon}</span>
                            {label}
                          </Link>
                        ))}
                      </div>

                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-150"
                        style={{ color: "#f87171" }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            "rgba(248,113,113,0.08)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background = "transparent")
                        }
                      >
                        <MdLogout />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 hover:scale-105 hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #f97316, #dc2626)",
                  color: "#fff",
                  boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Search Drawer (animated) ── */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300 ease-in-out relative"
        ref={mobileSearchDropdownRef}
        style={{
          maxHeight: mobileSearchOpen ? (showDropdown ? "500px" : "72px") : "0px",
          opacity: mobileSearchOpen ? 1 : 0,
          borderTop: mobileSearchOpen ? "1px solid rgba(212,175,55,0.15)" : "none",
        }}
      >
        <div className="px-4 py-3 relative">
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1.5px solid rgba(212,175,55,0.5)",
            }}
          >
            <FiSearch className="flex-shrink-0" style={{ color: "#e8c14e" }} />
            <input
              ref={mobileSearchInputRef}
              type="text"
              placeholder="Search restaurants or dishes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "#f3f4f6" }}
            />
            {searchQuery && (
              <>
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ color: "#6b7280" }}
                  aria-label="Clear"
                >
                  <FiX />
                </button>
                <button
                  onClick={handleSearch}
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #f97316, #dc2626)",
                    color: "#fff",
                  }}
                >
                  Go
                </button>
              </>
            )}
          </div>
          {mobileSearchOpen && showDropdown && (
            <SearchDropdown
              autocompleteLoading={autocompleteLoading}
              flatResults={flatResults}
              autocompleteData={autocompleteData}
              activeIndex={activeIndex}
              searchQuery={searchQuery}
              setActiveIndex={setActiveIndex}
              goToResult={goToResultCb}
              handleSearch={handleSearch}
            />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;