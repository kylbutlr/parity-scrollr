from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ICON_DIRECTORY = ROOT / "icons"
MASTER_SIZE = 1024
SIZES = (16, 32, 48, 128)
GRADIENT_STOPS = (
    (0.0, (17, 17, 17, 255)),
    (0.48, (73, 84, 91, 255)),
    (1.0, (169, 206, 194, 255)),
)


def interpolate_color(position: float) -> tuple[int, int, int, int]:
    for index in range(len(GRADIENT_STOPS) - 1):
        start_position, start_color = GRADIENT_STOPS[index]
        end_position, end_color = GRADIENT_STOPS[index + 1]
        if position <= end_position:
            progress = (position - start_position) / (end_position - start_position)
            return tuple(
                round(start + (end - start) * progress)
                for start, end in zip(start_color, end_color)
            )
    return GRADIENT_STOPS[-1][1]


def create_gradient() -> Image.Image:
    gradient = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE))
    pixels = gradient.load()
    for y in range(MASTER_SIZE):
        normalized_y = y / (MASTER_SIZE - 1)
        for x in range(MASTER_SIZE):
            normalized_x = x / (MASTER_SIZE - 1)
            position = max(0.0, min(1.0, (normalized_x - normalized_y + 1) / 2))
            pixels[x, y] = interpolate_color(position)
    return gradient


def create_master_icon() -> Image.Image:
    image = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))
    mask = Image.new("L", (MASTER_SIZE, MASTER_SIZE), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((92, 92, 932, 932), radius=190, fill=255)
    image.paste(create_gradient(), (0, 0), mask)

    draw = ImageDraw.Draw(image)
    glyph_lines = (
        ((390, 320), (390, 704)),
        ((330, 380), (390, 320), (450, 380)),
        ((330, 644), (390, 704), (450, 644)),
        ((634, 320), (634, 704)),
        ((574, 380), (634, 320), (694, 380)),
        ((574, 644), (634, 704), (694, 644)),
    )
    for points in glyph_lines:
        draw.line(points, fill="#FFFFFF", width=72, joint="curve")
        radius = 36
        for x, y in (points[0], points[-1]):
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill="#FFFFFF")
    return image


def main() -> None:
    ICON_DIRECTORY.mkdir(exist_ok=True)
    master = create_master_icon()

    for size in SIZES:
        icon = master.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(ICON_DIRECTORY / f"icon-{size}.png", optimize=True)


if __name__ == "__main__":
    main()
