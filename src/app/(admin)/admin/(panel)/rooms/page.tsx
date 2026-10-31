import Link from "next/link";
import { serviceClient } from "@/lib/supabase/admin";
import { getAdminDict } from "@/lib/admin-i18n";
import { formatFcfa } from "@/lib/format";
import type { Room } from "@/lib/types";
import { DeleteRoomButton } from "@/components/DeleteRoomButton";
import { toggleRoomActive } from "../actions";

export default async function AdminRoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; hidden?: string }>;
}) {
  const sp = await searchParams;
  const { lang, t } = await getAdminDict();
  const { data } = await serviceClient().from("rooms").select("*").order("sort_order").order("price_per_night");
  const rooms = (data ?? []) as Room[];
  const roomName = (r: Room) => (lang === "en" ? r.name_en : r.name_fr) || r.name_fr;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "2rem", margin: 0 }}>{t.roomsTitle}</h1>
        <Link href="/admin/rooms/new" className="btn btn-primary">{t.addNewRoom}</Link>
      </div>
      <p className="muted">{t.roomsLead}</p>
      {sp.saved && <p className="alert alert-ok">{t.roomsSaved}</p>}
      {sp.deleted && <p className="alert alert-ok">{t.roomsDeleted}</p>}
      {sp.hidden && <p className="alert alert-error">{t.roomsHidden}</p>}

      <div className="panel table-wrap">
        {rooms.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>{t.noRooms}</p>
        ) : (
          <table className="responsive-table">
            <thead>
              <tr>
                <th>{t.colRoom}</th>
                <th>{t.colPrice}</th>
                <th>{t.capacity}</th>
                <th>{t.colQty}</th>
                <th>{t.colVisible}</th>
                <th>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td data-label={t.colRoom}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {r.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image_url} alt="" width={72} height={54} style={{ objectFit: "cover", borderRadius: 8, flex: "none" }} />
                      ) : (
                        <span style={{ width: 72, height: 54, borderRadius: 8, background: "#e8eee6", flex: "none" }} />
                      )}
                      <strong>{roomName(r)}</strong>
                    </div>
                  </td>
                  <td data-label={t.colPrice}>{formatFcfa(r.price_per_night)}</td>
                  <td data-label={t.capacity}>{r.capacity}</td>
                  <td data-label={t.colQty}>{r.quantity}</td>
                  <td data-label={t.colVisible}>
                    <span className="status-pill" data-status={r.active ? "confirmed" : "declined"}>
                      {r.active ? t.shown : t.hidden}
                    </span>
                  </td>
                  <td data-label={t.colActions}>
                    <div className="row-actions">
                      <Link href={`/admin/rooms/${r.id}`} className="btn btn-ghost btn-ghost-dark btn-sm">{t.edit}</Link>
                      <form action={toggleRoomActive}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="active" value={String(!r.active)} />
                        <button className="btn btn-ghost btn-ghost-dark btn-sm" type="submit">{r.active ? t.hide : t.show}</button>
                      </form>
                      <DeleteRoomButton id={r.id} label={t.remove} confirmText={t.confirmDelete} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
