import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ className = "", priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/frimps-logo.jpeg"
      alt="Frimps MB Autoboss"
      width={160}
      height={160}
      priority={priority}
      sizes="(max-width: 640px) 120px, 160px"
      className={`brand-logo ${className}`.trim()}
    />
  );
}
