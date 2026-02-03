import type React from "react";

export type LucideProps = React.SVGProps<SVGSVGElement> & {
  size?: number | string;
  color?: string;
  stroke?: string;
};

type IconDefinition = {
  displayName: string;
  paths: string[];
};

function IconBase({
  size = 24,
  color = "currentColor",
  stroke = "currentColor",
  strokeWidth = 2,
  className,
  title,
  children,
  ...props
}: LucideProps & { title?: string }) {
  const accessibleTitle = title ?? props["aria-label"] ?? "icon";
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      color={color}
      {...props}
    >
      <title>{accessibleTitle}</title>
      {children}
    </svg>
  );
}

function createIcon({ displayName, paths }: IconDefinition) {
  const Component = (props: LucideProps) => (
    <IconBase {...props}>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </IconBase>
  );
  Component.displayName = displayName;
  return Component;
}

export const Sun = createIcon({
  displayName: "Sun",
  paths: [
    "M12 4V2",
    "M12 22v-2",
    "M4.93 4.93l-1.41-1.41",
    "M20.48 20.48l-1.41-1.41",
    "M4 12H2",
    "M22 12h-2",
    "M6.34 17.66l-1.41 1.41",
    "M18.07 5.93l-1.41 1.41",
    "M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8",
  ],
});

export const Moon = createIcon({
  displayName: "Moon",
  paths: ["M12 3a7.5 7.5 0 0 0 9 9a9 9 0 1 1-9-9"],
});

export const Globe2 = createIcon({
  displayName: "Globe2",
  paths: [
    "M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20",
    "M2 12h20",
    "M12 2a15.3 15.3 0 0 1 0 20",
    "M12 2a15.3 15.3 0 0 0 0 20",
  ],
});

export const LayoutDashboard = createIcon({
  displayName: "LayoutDashboard",
  paths: ["M3 3h8v8H3z", "M13 3h8v5h-8z", "M13 10h8v11h-8z", "M3 13h8v8H3z"],
});

export const Settings = createIcon({
  displayName: "Settings",
  paths: [
    "M12 1v2",
    "M12 21v2",
    "M4.22 4.22l1.42 1.42",
    "M18.36 18.36l1.42 1.42",
    "M1 12h2",
    "M21 12h2",
    "M4.22 19.78l1.42-1.42",
    "M18.36 5.64l1.42-1.42",
    "M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8",
  ],
});

export const Sparkles = createIcon({
  displayName: "Sparkles",
  paths: [
    "M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2",
    "M5 17l1 3l3 1l-3 1l-1 3l-1-3l-3-1l3-1l1-3",
    "M19 15l0.7 2.1L22 18l-2.3 0.9L19 21l-0.7-2.1L16 18l2.3-0.9L19 15",
  ],
});

export const ArrowRight = createIcon({
  displayName: "ArrowRight",
  paths: ["M5 12h14", "M13 5l7 7-7 7"],
});

export const ShieldCheck = createIcon({
  displayName: "ShieldCheck",
  paths: ["M12 2l7 4v6c0 5-3.5 9-7 10c-3.5-1-7-5-7-10V6l7-4", "M9 12l2 2l4-4"],
});

export const Activity = createIcon({
  displayName: "Activity",
  paths: ["M22 12h-4l-3 7-4-14-3 7H2"],
});

export const LineChart = createIcon({
  displayName: "LineChart",
  paths: ["M3 3v18h18", "M7 14l3-3l4 4l5-6"],
});

export const LogIn = createIcon({
  displayName: "LogIn",
  paths: [
    "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4",
    "M10 17l5-5-5-5",
    "M15 12H3",
  ],
});

export const LogOut = createIcon({
  displayName: "LogOut",
  paths: [
    "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
    "M16 17l5-5-5-5",
    "M21 12H9",
  ],
});

export const Rocket = createIcon({
  displayName: "Rocket",
  paths: [
    "M4.5 16.5L3 21l4.5-1.5",
    "M5 15l4-4",
    "M12 3c4 0 7 3 7 7l-5.5 5.5c-1.8 1.8-4.7 1.8-6.5 0L6 14.5C4.2 12.7 4.2 9.8 6 8l5-5z",
    "M13 7a2 2 0 1 0 0 4a2 2 0 0 0 0-4",
  ],
});

export const User = createIcon({
  displayName: "User",
  paths: ["M20 21c0-4-4-6-8-6s-8 2-8 6", "M12 7a4 4 0 1 0 0 8a4 4 0 0 0 0-8"],
});
