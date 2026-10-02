import type { SVGProps } from "react";

/**
 * Monochrome 16×16 stroke icons for the editor shell.
 *
 * Per AGENT_RULES 6, no icon package is added; these inline SVGs replace it.
 * They inherit `currentColor`, use `stroke="currentColor"` consistently, and
 * are sized through the CSS `size-4` utility at the call site.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MoveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5v13M1.5 8h13" />
      <path d="M8 1.5 6 3.5M8 1.5l2 2M8 14.5l-2-2M8 14.5l2-2M1.5 8l2-2M1.5 8l2 2M14.5 8l-2-2M14.5 8l-2 2" />
    </Icon>
  );
}

export function SelectIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 2.5 12.5 8 8.5 9 10.5 13.5 8.75 14.25 6.75 9.75 4 12Z" />
    </Icon>
  );
}

export function FrameIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 1.5v13M11.5 1.5v13M1.5 4.5h13M1.5 11.5h13" />
    </Icon>
  );
}

export function TextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 4V2.5h10V4M8 2.5v11M6 13.5h4" />
    </Icon>
  );
}

export function ShapeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="2.5" width="11" height="11" />
    </Icon>
  );
}

export function PenIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5c2.5 2 4 4.5 4 7.5H4c0-3 1.5-5.5 4-7.5Z" />
      <path d="M4 9l-1.5 4.5L8 12l5.5 1.5L12 9" />
    </Icon>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="3" width="12" height="10" />
      <circle cx="5.75" cy="6.25" r="1" />
      <path d="m2.5 11.5 3.5-3.5 2 2 2.5-2.5 3 3" />
    </Icon>
  );
}

export function HandIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 8V3.75a.9.9 0 0 1 1.8 0V7M7.3 7V2.75a.9.9 0 0 1 1.8 0V7M9.1 7.5V3.75a.9.9 0 0 1 1.8 0V9M5.5 8l-1.6-1.6a.95.95 0 0 0-1.35 1.35l3.05 3.05c.9.9 1.9 1.7 3.5 1.7 2 0 3.4-1.4 3.4-3.5V9" />
    </Icon>
  );
}

export function ZoomIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3 3M7 5.25v3.5M5.25 7h3.5" />
    </Icon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 8c1.8-2.8 4-4.2 6-4.2S12.2 5.2 14 8c-1.8 2.8-4 4.2-6 4.2S3.8 10.8 2 8Z" />
      <path d="m3 13 10-10" />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="7" width="9" height="6.5" />
      <path d="M5.5 7V5.25a2.5 2.5 0 0 1 5 0V7" />
    </Icon>
  );
}
