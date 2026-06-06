interface ColorSwatchProps {
  hex: string;
  rgba?: string;
  cmyk?: string;
  size?: "sm" | "md" | "lg";
}

export default function ColorSwatch({ hex, rgba, cmyk, size = "md" }: ColorSwatchProps) {
  const heights = { sm: "h-16", md: "h-28", lg: "h-40" };

  return (
    <div>
      <div
        className={`w-full ${heights[size]} border-b-2 border-black`}
        style={{ backgroundColor: hex }}
      />
      {size !== "sm" && (
        <div className="p-2 space-y-0.5">
          <div className="font-mono font-bold text-xs text-black">{hex}</div>
          {rgba && <div className="font-mono text-[10px] text-black/50">{rgba}</div>}
          {cmyk && <div className="font-mono text-[10px] text-black/40">{cmyk}</div>}
        </div>
      )}
    </div>
  );
}
