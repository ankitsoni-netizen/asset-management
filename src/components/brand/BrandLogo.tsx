import Image from "next/image";

const LOGOS = {
  white: {
    src: "/brand/cloutflow-logo-white.png",
    width: 781,
    height: 152,
  },
  color: {
    src: "/brand/cloutflow-logo-color.png",
    width: 990,
    height: 175,
  },
} as const;

export function BrandLogo({
  className = "h-10 w-auto max-w-[220px]",
  priority = false,
  variant = "white",
}: {
  className?: string;
  priority?: boolean;
  variant?: keyof typeof LOGOS;
}) {
  const logo = LOGOS[variant];
  return (
    <Image
      src={logo.src}
      alt="Cloutflow"
      width={logo.width}
      height={logo.height}
      className={`object-contain object-left ${className}`}
      priority={priority}
    />
  );
}
