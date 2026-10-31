import { Icon, type IconName } from "./Icon";
import { PhotoSlider } from "./PhotoSlider";

/** Solid fallback background colours (no gradients). */
const tones: Record<string, string> = {
  green: "#0f3b2d",
  gold: "#7a5409",
  water: "#0b3b4a",
  violet: "#2b1a4d",
  warm: "#4a2511",
};

export type Tone = keyof typeof tones;

type Props = {
  /** Chemin dans /public, par exemple /images/rooms/standard.jpg. Si le fichier est absent, le repli s'affiche. */
  src?: string | null;
  alt: string;
  /** Several images: they are shown as a slider (takes precedence over `src`). */
  images?: string[];
  tone?: Tone;
  icon?: IconName;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Photo avec repli : l'image est posée par-dessus une couleur solide + une icône.
 * Tant que la photo n'est pas ajoutée dans /public/images, le repli reste visible.
 */
export function Photo({ src, images, alt, tone = "green", icon = "lotus", className = "", children }: Props) {
  const list = (images ?? []).filter(Boolean);
  return (
    <div className={`photo ${className}`} role="img" aria-label={alt} style={{ background: tones[tone] ?? tones.green }}>
      <Icon name={icon} size={44} className="photo-icon" />
      {list.length > 1 ? (
        <PhotoSlider images={list} alt={alt} />
      ) : (
        (list[0] ?? src) && <div className="photo-img" style={{ backgroundImage: `url(${list[0] ?? src})` }} />
      )}
      {children}
    </div>
  );
}
