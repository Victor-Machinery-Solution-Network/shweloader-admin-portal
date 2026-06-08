import { NextResponse } from "next/server";
import { getSettings } from "@/lib/cache";
import { SYSTEM_EXCHANGE_RATE } from "@/lib/constants";
import { SETTING_KEYS } from "@/types/setting";

export async function GET() {
  const settings = await getSettings();
  const exchangeRate =
    Number(settings[SETTING_KEYS.EXCHANGE_RATE]) || SYSTEM_EXCHANGE_RATE;

  return NextResponse.json({ exchangeRate });
}
