import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const HARDWARE_CATEGORIES = [
  "cpu",
  "gpu",
  "ram",
  "storage",
  "motherboard",
  "psu",
  "case",
  "cooling",
] as const;

export const HARDWARE_CONDITIONS = [
  "brand_new",
  "refurbished_qc_passed",
  "used",
] as const;

export type HardwareCategory = (typeof HARDWARE_CATEGORIES)[number];
export type HardwareCondition = (typeof HARDWARE_CONDITIONS)[number];
export type HardwareSpecs = Record<string, unknown>;

export type HardwareComponent = {
  id: string;
  name: string;
  brand: string;
  category: HardwareCategory;
  architecture: string | null;
  base_price: number;
  stock_quantity: number;
  condition: HardwareCondition;
  specs: HardwareSpecs;
  performance_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type HardwareComponentInput = Omit<
  HardwareComponent,
  "id" | "created_at" | "updated_at"
>;

const HARDWARE_COMPONENT_COLUMNS =
  "id, name, brand, category, architecture, base_price, stock_quantity, condition, specs, performance_score, is_active, created_at, updated_at";

export async function listHardwareComponents(options: { activeOnly?: boolean } = {}): Promise<HardwareComponent[]> {
  const supabase = getSupabaseBrowserClient();
  const pageSize = 500;
  const components: HardwareComponent[] = [];

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("hardware_components")
      .select(HARDWARE_COMPONENT_COLUMNS)
      .order("name", { ascending: true })
      .range(from, from + pageSize - 1);
    if (options.activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw new Error(`Could not load hardware components: ${error.message}`);
    const page = (data || []) as HardwareComponent[];
    components.push(...page);
    if (page.length < pageSize) break;
  }

  return components;
}

export async function getHardwareComponent(id: string): Promise<HardwareComponent> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("hardware_components")
    .select(HARDWARE_COMPONENT_COLUMNS)
    .eq("id", id)
    .single();

  if (error) throw new Error(`Could not load hardware component: ${error.message}`);
  return data as HardwareComponent;
}

export async function createHardwareComponent(input: HardwareComponentInput): Promise<HardwareComponent> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("hardware_components")
    .insert(input)
    .select(HARDWARE_COMPONENT_COLUMNS)
    .single();

  if (error) throw new Error(`Could not add hardware component: ${error.message}`);
  return data as HardwareComponent;
}

export async function updateHardwareComponent(
  id: string,
  input: Partial<HardwareComponentInput>,
): Promise<HardwareComponent> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("hardware_components")
    .update(input)
    .eq("id", id)
    .select(HARDWARE_COMPONENT_COLUMNS)
    .single();

  if (error) throw new Error(`Could not update hardware component: ${error.message}`);
  return data as HardwareComponent;
}

export async function deleteHardwareComponent(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("hardware_components").delete().eq("id", id);

  if (error) throw new Error(`Could not delete hardware component: ${error.message}`);
}
