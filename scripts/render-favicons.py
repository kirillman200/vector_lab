"""Render PNG and ICO fallbacks for the small, fixed favicon.svg artwork."""

from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SUPERSAMPLE = 4


def render_icon(size: int) -> Image.Image:
    canvas_size = size * SUPERSAMPLE
    unit = canvas_size / 64
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        (0, 0, canvas_size - 1, canvas_size - 1),
        radius=14 * unit,
        fill="#2f6fed",
    )

    points = []
    for index in range(101):
        t = index / 100
        inverse = 1 - t
        x = inverse**3 * 14 + 3 * inverse**2 * t * 24 + 3 * inverse * t**2 * 40 + t**3 * 50
        y = inverse**3 * 44 + 3 * inverse**2 * t * 18 + 3 * inverse * t**2 * 50 + t**3 * 24
        points.append((round(x * unit), round(y * unit)))
    draw.line(points, fill="#ffffff", width=round(5 * unit), joint="curve")

    def circle(cx: float, cy: float, radius: float, fill: str, outline: str | None = None, width: float = 0) -> None:
        bounds = (
            (cx - radius) * unit,
            (cy - radius) * unit,
            (cx + radius) * unit,
            (cy + radius) * unit,
        )
        draw.ellipse(bounds, fill=fill, outline=outline, width=round(width * unit) if outline else 1)

    circle(14, 44, 5.5, "#ffffff")
    circle(50, 24, 5.5, "#ffffff", "#f59e0b", 2.5)

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    for size, filename in (
        (32, "favicon-32.png"),
        (180, "apple-touch-icon.png"),
        (192, "favicon-192.png"),
        (512, "favicon-512.png"),
    ):
        render_icon(size).save(PUBLIC / filename, optimize=True)

    render_icon(256).save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )


if __name__ == "__main__":
    main()
