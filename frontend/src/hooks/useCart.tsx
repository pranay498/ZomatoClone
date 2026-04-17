import React, { useRef, useCallback, useEffect } from "react";
import { ICartItem } from "../types";
import apiClient from "../services/apiClient";
// ─────────────────────────────────────────────
//  useCart — Client-side cart with backend sync
//
//  Flow:
//  1. Frontend manages state locally (fast UI updates)
//  2. After every change, a 2-second debounced sync
//     writes the cart to MongoDB via POST /api/v1/cart/sync
//  3. On checkout click the caller force-syncs first
// ─────────────────────────────────────────────
export const useCart = () => {
    const [items, setItems] = React.useState<ICartItem[]>([]);
    const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // ── Map frontend items → backend format for sync ──
    const toSyncPayload = useCallback((cartItems: ICartItem[]) => {
        return cartItems.map(item => ({
            menuItemId: item._id,    // frontend uses _id, backend expects menuItemId
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            imageUrl: item.imageUrl || undefined,
        }));
    }, []);

    // ── Sync cart to backend (debounced) ──
    const syncToBackend = useCallback(async (cartItems: ICartItem[]) => {
        try {
            if (cartItems.length === 0) {
                await apiClient.delete("/cart/clear");
                console.log("🔵 Cart cleared on backend");
            } else {
                await apiClient.post("/cart/sync", {
                    items: toSyncPayload(cartItems),
                });
                console.log("🔵 Cart synced to backend");
            }
        } catch (err) {
            console.warn("⚠️ Cart sync failed (will retry):", err);
        }
    }, [toSyncPayload]);

    // ── Schedule a debounced sync ──
    const scheduleSyncDebounced = useCallback((cartItems: ICartItem[]) => {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
            syncToBackend(cartItems);
        }, 2000);
    }, [syncToBackend]);

    // ── Force sync (call before checkout / page unload) ──
    const forceSync = useCallback(async (cartItems?: ICartItem[]) => {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        await syncToBackend(cartItems ?? items);
    }, [syncToBackend, items]);

    // ── Load cart from backend on mount ──
    useEffect(() => {
        const loadCart = async () => {
            try {
                const res = await apiClient.get("/cart");
                if (res.data.success && res.data.data?.items?.length > 0) {
                    const backendItems: ICartItem[] = res.data.data.items.map((item: any) => ({
                        _id: item.menuItemId?.toString?.() || item.menuItemId,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        imageUrl: item.imageUrl,
                        restaurantId: res.data.data.restaurantId,
                    }));
                    setItems(backendItems);
                    console.log("🟢 Cart loaded from backend:", backendItems.length, "items");
                }
            } catch (err) {
                console.log("ℹ️ No saved cart found or not logged in");
            }
        };
        loadCart();
    }, []);

    // ── Cleanup pending sync timer on unmount ──
    useEffect(() => {
        return () => {
            if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        };
    }, []);

    // ── Add item ──
    const addItem = (item: Omit<ICartItem, "quantity">) => {
        setItems(prev => {
            const existing = prev.find(i => i._id === item._id);
            let next: ICartItem[];
            if (existing) {
                next = prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
            } else {
                next = [...prev, { ...item, quantity: 1 }];
            }
            scheduleSyncDebounced(next);
            return next;
        });
    };

    // ── Remove item (decrement or remove) ──
    const removeItem = (id: string) => {
        setItems(prev => {
            const existing = prev.find(i => i._id === id);
            if (!existing) return prev;
            let next: ICartItem[];
            if (existing.quantity === 1) {
                next = prev.filter(i => i._id !== id);
            } else {
                next = prev.map(i => i._id === id ? { ...i, quantity: i.quantity - 1 } : i);
            }
            scheduleSyncDebounced(next);
            return next;
        });
    };

    // ── Clear cart ──
    const clearCart = () => {
        setItems([]);
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        apiClient.delete("/cart/clear").catch(() => { });
    };

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

    return { items, addItem, removeItem, clearCart, total, itemCount, forceSync };
};