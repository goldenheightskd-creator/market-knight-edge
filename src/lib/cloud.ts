// Cloud data hooks backed by Supabase (Lovable Cloud) + TanStack Query.
// All queries respect RLS — every table is auth.uid()=user_id scoped.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Tables created in migration but types may not be regenerated — cast for safety.
const db = supabase as any;

// ===== Auth =====
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);
  return { session, user: session?.user ?? null as User | null, loading };
}

// ===== Preferences =====
export interface UserPrefs {
  current_asset: string | null;
  account_size: number | null;
  risk_pct: number | null;
  prefs: Record<string, any>;
}

export function usePrefs(userId: string | undefined) {
  return useQuery({
    queryKey: ["prefs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<UserPrefs> => {
      const { data, error } = await db.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data ?? { current_asset: null, account_size: null, risk_pct: null, prefs: {} };
    },
  });
}

export function useSavePrefs(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<UserPrefs>) => {
      if (!userId) throw new Error("no user");
      const { error } = await db.from("user_preferences").upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prefs", userId] }),
  });
}

// ===== Asset Levels =====
export interface AssetLevelRow {
  id: string;
  asset: string;
  levels: { pdh?: number; pdl?: number; pwh?: number; pwl?: number; price?: number };
  updated_at: string;
}

export function useAssetLevels(userId: string | undefined) {
  return useQuery({
    queryKey: ["asset_levels", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AssetLevelRow[]> => {
      const { data, error } = await db.from("asset_levels").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveLevels(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { asset: string; levels: AssetLevelRow["levels"] }) => {
      if (!userId) throw new Error("no user");
      const { error } = await db.from("asset_levels").upsert(
        { user_id: userId, asset: input.asset, levels: input.levels, updated_at: new Date().toISOString() },
        { onConflict: "user_id,asset" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asset_levels", userId] });
    },
  });
}

// ===== Trades =====
export interface Trade {
  id: string;
  trade_date: string;
  asset: string;
  direction: "Long" | "Short";
  setup: string | null;
  entry: number | null;
  stop: number | null;
  target: number | null;
  exit_price: number | null;
  outcome: "Win" | "Loss" | "Breakeven";
  pnl: number;
  emotion: string | null;
  followed_plan: boolean;
  notes: string | null;
  lesson: string | null;
  created_at: string;
}

export function useTrades(userId: string | undefined) {
  return useQuery({
    queryKey: ["trades", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await db.from("trades").select("*").eq("user_id", userId).order("trade_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveTrade(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Omit<Trade, "id" | "created_at">) => {
      if (!userId) throw new Error("no user");
      const { error } = await db.from("trades").insert({ ...t, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades", userId] }),
  });
}

export function useDeleteTrade(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("trades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades", userId] }),
  });
}

// ===== Alerts =====
export interface AlertRow {
  id: string;
  asset: string;
  direction: string | null;
  level: number | null;
  level_type: string | null;
  note: string | null;
  triggered_at: string;
  acknowledged: boolean;
}

export function useAlertsLog(userId: string | undefined) {
  return useQuery({
    queryKey: ["alerts", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AlertRow[]> => {
      const { data, error } = await db.from("alerts").select("*").eq("user_id", userId).order("triggered_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useLogAlert(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Omit<AlertRow, "id" | "triggered_at" | "acknowledged">) => {
      if (!userId) throw new Error("no user");
      const { data, error } = await db.from("alerts").insert({ ...a, user_id: userId }).select().single();
      if (error) throw error;
      return data as AlertRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", userId] }),
  });
}

export function useClearAlerts(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await db.from("alerts").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", userId] }),
  });
}

// ===== Daily Checklist =====
export interface ChecklistRow {
  log_date: string;
  marked_levels: boolean;
  checked_session: boolean;
  risk_calculated: boolean;
}

export function useTodayChecklist(userId: string | undefined) {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["checklist", userId, today],
    enabled: !!userId,
    queryFn: async (): Promise<ChecklistRow> => {
      const { data, error } = await db.from("checklist_log").select("*").eq("user_id", userId).eq("log_date", today).maybeSingle();
      if (error) throw error;
      return data ?? { log_date: today, marked_levels: false, checked_session: false, risk_calculated: false };
    },
  });
}

export function useUpdateChecklist(userId: string | undefined) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  return useMutation({
    mutationFn: async (patch: Partial<ChecklistRow>) => {
      if (!userId) throw new Error("no user");
      const { error } = await db.from("checklist_log").upsert(
        { user_id: userId, log_date: today, ...patch },
        { onConflict: "user_id,log_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist", userId, today] }),
  });
}
