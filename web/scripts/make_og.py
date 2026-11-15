"""Draw the static 1200x630 Open Graph card with the standard library."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

WIDTH = 1200
HEIGHT = 630
PIXELS = bytearray(WIDTH * HEIGHT * 3)

FONT = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
}


def set_pixel(x: int, y: int, color: tuple[int, int, int]) -> None:
    if 0 <= x < WIDTH and 0 <= y < HEIGHT:
        index = (y * WIDTH + x) * 3
        PIXELS[index : index + 3] = bytes(color)


def fill_rect(x0: int, y0: int, x1: int, y1: int, color: tuple[int, int, int]) -> None:
    for y in range(max(0, y0), min(HEIGHT, y1)):
        start = (y * WIDTH + max(0, x0)) * 3
        end = (y * WIDTH + min(WIDTH, x1)) * 3
        PIXELS[start:end] = bytes(color) * ((end - start) // 3)


def text(message: str, x: int, y: int, scale: int, color: tuple[int, int, int]) -> None:
    cursor = x
    for character in message:
        glyph = FONT.get(character, FONT[" "])
        for row, bits in enumerate(glyph):
            for col, bit in enumerate(bits):
                if bit == "1":
                    fill_rect(
                        cursor + col * scale,
                        y + row * scale,
                        cursor + (col + 1) * scale,
                        y + (row + 1) * scale,
                        color,
                    )
        cursor += 6 * scale


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def main() -> None:
    for y in range(HEIGHT):
        shade = int(8 + 16 * (y / HEIGHT))
        fill_rect(0, y, WIDTH, y + 1, (5, 6, shade))
    center_x, center_y, radius = 280, 330, 150
    for y in range(center_y - radius, center_y + radius):
        for x in range(center_x - radius, center_x + radius):
            dx = x - center_x
            dy = y - center_y
            if dx * dx + dy * dy <= radius * radius:
                edge = (dx * dx + dy * dy) / (radius * radius)
                set_pixel(x, y, (int(20 * edge), int(90 + 80 * (1 - edge)), int(120 + 70 * (1 - edge))))
    fill_rect(860, 250, 980, 310, (190, 214, 222))
    fill_rect(700, 268, 860, 292, (8, 70, 90))
    fill_rect(980, 268, 1140, 292, (48, 24, 90))
    text("ORBITAL SENTINEL", 70, 70, 6, (0, 229, 255))
    text("LSTM  NASA SMAP MSL", 70, 150, 3, (215, 231, 234))
    raw = b"".join(b"\x00" + PIXELS[y * WIDTH * 3 : (y + 1) * WIDTH * 3] for y in range(HEIGHT))
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    destination = Path(__file__).resolve().parents[1] / "public" / "og.png"
    destination.write_bytes(png)
    print(destination, len(png))


if __name__ == "__main__":
    main()
