#!/usr/bin/env python3
"""Print the component tree of a Delphi binary DFM resource."""

from __future__ import annotations

import argparse
import struct
from pathlib import Path


VALUE_NAMES = {
    0: "null",
    1: "list",
    2: "int8",
    3: "int16",
    4: "int32",
    5: "extended",
    6: "string",
    7: "ident",
    8: "false",
    9: "true",
    10: "binary",
    11: "set",
    12: "long-string",
    13: "nil",
    14: "collection",
    15: "single",
    16: "currency",
    17: "date",
    18: "wide-string",
    19: "int64",
    20: "utf8-string",
    21: "double",
}


class Reader:
    def __init__(self, data: bytes):
        self.data = data
        self.pos = 0

    def read(self, size: int) -> bytes:
        result = self.data[self.pos : self.pos + size]
        if len(result) != size:
            raise ValueError(f"unexpected end of file at 0x{self.pos:x}")
        self.pos += size
        return result

    def byte(self) -> int:
        return self.read(1)[0]

    def short_string(self) -> str:
        size = self.byte()
        return self.read(size).decode("cp1252")

    def integer(self, size: int) -> int:
        return int.from_bytes(self.read(size), "little", signed=True)

    def long_string(self, encoding: str) -> str:
        size = self.integer(4)
        return self.read(size).decode(encoding)

    def value(self):
        tag = self.byte()
        if tag == 0:
            return None
        if tag == 1:
            values = []
            while self.data[self.pos] != 0:
                values.append(self.value())
            self.pos += 1
            return values
        if tag == 2:
            return self.integer(1)
        if tag == 3:
            return self.integer(2)
        if tag == 4:
            return self.integer(4)
        if tag == 5:
            raw = self.read(10)
            return f"<80-bit extended: {raw.hex()}>"
        if tag in (6, 7):
            return self.short_string()
        if tag == 8:
            return False
        if tag == 9:
            return True
        if tag == 10:
            size = self.integer(4)
            self.read(size)
            return f"<{size} binary bytes>"
        if tag == 11:
            values = []
            while True:
                item = self.short_string()
                if not item:
                    return values
                values.append(item)
        if tag == 12:
            return self.long_string("cp1252")
        if tag == 13:
            return None
        if tag == 15:
            return struct.unpack("<f", self.read(4))[0]
        if tag == 16:
            return self.integer(8) / 10000
        if tag == 17:
            return struct.unpack("<d", self.read(8))[0]
        if tag == 18:
            count = self.integer(4)
            return self.read(count * 2).decode("utf-16le")
        if tag == 19:
            return self.integer(8)
        if tag == 20:
            return self.long_string("utf-8")
        if tag == 21:
            return struct.unpack("<d", self.read(8))[0]
        if tag == 14:
            raise ValueError("collection values are not yet supported")
        raise ValueError(
            f"unsupported value tag {tag} ({VALUE_NAMES.get(tag, 'unknown')}) "
            f"at 0x{self.pos - 1:x}"
        )

    def component(self, indent: int = 0) -> None:
        class_name = self.short_string()
        instance_name = self.short_string()
        print(f"{'  ' * indent}{class_name} {instance_name}")

        while True:
            property_name = self.short_string()
            if not property_name:
                break
            value = self.value()
            print(f"{'  ' * (indent + 1)}{property_name} = {value!r}")

        while self.data[self.pos] != 0:
            self.component(indent + 1)
        self.pos += 1


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dfm", type=Path)
    args = parser.parse_args()

    reader = Reader(args.dfm.read_bytes())
    if reader.read(4) != b"TPF0":
        raise ValueError("not a Delphi binary DFM (missing TPF0 signature)")
    reader.component()
    if reader.pos != len(reader.data):
        raise ValueError(
            f"{len(reader.data) - reader.pos} trailing bytes at 0x{reader.pos:x}"
        )


if __name__ == "__main__":
    main()
