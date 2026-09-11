import Image from "next/image";

export function BrandLogo({
  className = "h-10 w-auto max-w-[220px]",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/cloutflow-logo-white.png"
      alt="Cloutflow"
      width={640}
      height={160}
      className={`object-contain object-left ${className}`}
      priority={priority}
    />
  );
}
