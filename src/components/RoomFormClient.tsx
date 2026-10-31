"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import type { Room } from "@/lib/types";
import type { AdminDict, AdminLang } from "@/lib/admin-i18n";
import { saveRoom } from "@/app/(admin)/admin/(panel)/actions";

type Props = { selected: Room | null; t: AdminDict; lang: AdminLang };

export function RoomFormClient({ selected, t, lang }: Props) {
  const roomName = (r: Room) => (lang === "en" ? r.name_en : r.name_fr) || r.name_fr;
  const router = useRouter();
  const isNew = !selected;
  // Photos already saved (the first one is the cover) and newly picked files (previews only).
  const [kept, setKept] = useState<string[]>(() => {
    const g = (selected?.images ?? []).filter(Boolean);
    return g.length > 0 ? g : selected?.image_url ? [selected.image_url] : [];
  });
  const [fresh, setFresh] = useState<{ file: File; url: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Keep the real <input type=file> in sync with the list of previews. */
  function syncInput(list: { file: File }[]) {
    if (!fileRef.current) return;
    const dt = new DataTransfer();
    list.forEach((p) => dt.items.add(p.file));
    fileRef.current.files = dt.files;
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    // Each pick adds to the previous ones.
    const added = Array.from(e.target.files ?? []).map((file) => ({ file, url: URL.createObjectURL(file) }));
    const next = [...fresh, ...added];
    setFresh(next);
    syncInput(next);
  }

  function removeFresh(k: number) {
    URL.revokeObjectURL(fresh[k].url);
    const next = fresh.filter((_, j) => j !== k);
    setFresh(next);
    syncInput(next);
  }

  function makeCover(k: number) {
    setKept([kept[k], ...kept.filter((_, j) => j !== k)]);
  }

  return (
    <form action={saveRoom} className="panel form-grid" style={{ maxWidth: 900 }}>
      {selected && <input type="hidden" name="id" value={selected.id} />}
      <input type="hidden" name="lang" value={lang} />


      <h2 className="full" style={{ fontSize: "1.3rem", margin: 0 }}>
        {isNew ? t.newCategory : `${t.editPrefix} ${roomName(selected)}`}
      </h2>

      {/* ── Name & description (current admin language) ── */}
      <div className="field full">
        <label htmlFor="name">{t.name}</label>
        <input id="name" name="name" defaultValue={selected ? roomName(selected) : ""} required />
      </div>
      <div className="field full">
        <label htmlFor="description">{t.description}</label>
        <textarea
          id="description"
          name="description"
          defaultValue={(selected ? (lang === "en" ? selected.description_en : selected.description_fr) : "") ?? ""}
        />
      </div>

      {/* ── Pricing & capacity ── */}
      <div className="field">
        <label htmlFor="price_per_night">{t.pricePerNight}</label>
        <input id="price_per_night" name="price_per_night" type="number" min={0} step={500} defaultValue={selected?.price_per_night ?? 25000} required />
      </div>
      <div className="field">
        <label htmlFor="quantity">{t.quantity}</label>
        <input id="quantity" name="quantity" type="number" min={1} defaultValue={selected?.quantity ?? 1} required />
      </div>
      <div className="field">
        <label htmlFor="capacity">{t.capacity}</label>
        <input id="capacity" name="capacity" type="number" min={1} defaultValue={selected?.capacity ?? 2} required />
      </div>
      <div className="field">
        <label htmlFor="sort_order">{t.sortOrder}</label>
        <input id="sort_order" name="sort_order" type="number" defaultValue={selected?.sort_order ?? 0} />
      </div>

      <div className="field full">
        <label htmlFor="amenities">{t.amenities}</label>
        <input id="amenities" name="amenities" defaultValue={selected?.amenities.join(", ")} />
      </div>

      {/* ── Photo gallery ── */}
      <div className="field full">
        <label>{t.photos}</label>
        <span className="help">{t.photosHelp}</span>
        <div className="image-upload-area">
          {(kept.length > 0 || fresh.length > 0) && (
            <div className="gallery-grid">
              {kept.map((url, k) => (
                <div className="gallery-item" key={url + k}>
                  <input type="hidden" name="images_keep" value={url} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${t.preview} ${k + 1}`} />
                  {k === 0 && <span className="cover-badge">{t.cover}</span>}
                  <div className="gallery-actions">
                    {k > 0 && (
                      <button type="button" onClick={() => makeCover(k)}>{t.makeCover}</button>
                    )}
                    <button type="button" onClick={() => setKept(kept.filter((_, j) => j !== k))} aria-label={t.removePhoto}>×</button>
                  </div>
                </div>
              ))}
              {fresh.map((p, k) => (
                <div className="gallery-item is-new" key={p.url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`${t.preview} ${kept.length + k + 1}`} />
                  {kept.length === 0 && k === 0 && <span className="cover-badge">{t.cover}</span>}
                  <div className="gallery-actions">
                    <button type="button" onClick={() => removeFresh(k)} aria-label={t.removePhoto}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <label className="image-upload-drop" htmlFor="gallery_files">
            <input
              ref={fileRef}
              id="gallery_files"
              type="file"
              name="gallery_files"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFiles}
            />
            <div className="placeholder">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>{t.pickPhotos}</span>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>JPEG · PNG · WebP · 5 MB</span>
            </div>
          </label>

          <div style={{ marginTop: 8 }}>
            <span className="help" style={{ display: "block", marginBottom: 6 }}>
              {t.pasteUrl}
            </span>
            <input name="image_url_manual" type="url" placeholder="https://..." />
          </div>
        </div>
      </div>

      {/* ── Visibility ── */}
      <label className="full" style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
        <input type="checkbox" name="active" defaultChecked={selected?.active ?? true} style={{ width: 20, minHeight: 20 }} />
        {t.visible}
      </label>

      {/* ── Actions ── */}
      <div className="full" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-primary" type="submit">
          {isNew ? t.addRoom : t.saveChanges}
        </button>
        <button type="button" className="btn btn-ghost btn-ghost-dark" onClick={() => router.push("/admin/rooms")}>
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
