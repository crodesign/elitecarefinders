import { createClientComponentClient } from "@/lib/supabase";

export interface ScriptEntry {
    id: string;
    name: string;
    code: string;
    enabled: boolean;
    location: 'header' | 'body' | 'footer';
}

export async function getSiteSetting(key: string): Promise<string> {
    const supabase = createClientComponentClient();
    const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .single();
    return data?.value ?? "";
}

export async function saveSiteSetting(key: string, value: string): Promise<void> {
    const supabase = createClientComponentClient();
    const { error } = await supabase
        .from("site_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
}

export async function getInjectedScripts(): Promise<ScriptEntry[]> {
    const raw = await getSiteSetting("injected_scripts");
    if (!raw?.trim()) return [];
    try {
        return JSON.parse(raw) as ScriptEntry[];
    } catch {
        return [];
    }
}

export async function saveInjectedScripts(scripts: ScriptEntry[]): Promise<void> {
    await saveSiteSetting("injected_scripts", JSON.stringify(scripts));
}
