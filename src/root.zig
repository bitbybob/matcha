const std = @import("std");

pub const version = "0.1.0-zig";

pub fn writeVersion(writer: *std.Io.Writer) std.Io.Writer.Error!void {
    try writer.print("matcha {s}\n", .{version});
}

test "root cli module exposes placeholder version" {
    try std.testing.expect(version.len > 0);
}
