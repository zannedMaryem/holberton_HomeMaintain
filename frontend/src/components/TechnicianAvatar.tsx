import { useEffect, useState } from "react";

interface TechnicianAvatarProps {
  name: string;
  photoDataUrl?: string;
  className?: string;
}

export default function TechnicianAvatar({
  name,
  photoDataUrl,
  className = "",
}: TechnicianAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [photoDataUrl]);

  if (photoDataUrl && !imageFailed) {
    return (
      <img
        className={`technician-avatar ${className}`}
        src={photoDataUrl}
        alt={`${name} profile`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span className={`technician-avatar ${className}`} aria-label={`${name} profile`}>
      {initials(name)}
    </span>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
