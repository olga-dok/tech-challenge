type AvatarProps = {
  src?: string;
  alt: string;
  fallback: string;
  size?: number;
  className?: string;
  imageClassName?: string;
  onImageError?: () => void;
};

export function Avatar({
  src,
  alt,
  fallback,
  size = 96,
  className = "",
  imageClassName = "",
  onImageError,
}: AvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`h-full w-full object-cover ${imageClassName}`}
          width={size}
          height={size}
          onError={() => {
            onImageError?.();
          }}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
