/** A member's photo thumbnail, or their initials when there is none. */

interface AvatarProps {
  name: string;
  initials: string;
  photoUrl: string | null;
}

export function Avatar({ name, initials, photoUrl }: AvatarProps) {
  if (photoUrl) {
    return <img className="wb-coh-avatar" src={photoUrl} alt="" aria-hidden="true" loading="lazy" title={name} />;
  }
  return (
    <span className="wb-coh-avatar wb-coh-avatar--initials" aria-hidden="true">
      {initials}
    </span>
  );
}
