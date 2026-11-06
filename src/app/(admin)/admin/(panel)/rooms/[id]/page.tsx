import Link from "next/link";
import { notFound } from "next/navigation";
import { serviceClient } from "@/lib/supabase/admin";
import { getAdminDict } from "@/lib/admin-i18n";
import { requireAdmin } from "@/lib/admin-auth";
import type { Room } from "@/lib/types";
import { RoomFormClient } from "@/components/RoomFormClient";

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { lang, t } = await getAdminDict();

  let room: Room | null = null;
  if (id !== "new") {
    const { data } = await serviceClient().from("rooms").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    room = data as Room;
  }

  return (
    <>
      <p style={{ margin: "0 0 12px" }}>
        <Link href="/admin/rooms">{t.backToRooms}</Link>
      </p>
      <RoomFormClient key={room?.id ?? "new"} selected={room} t={t} lang={lang} />
    </>
  );
}
