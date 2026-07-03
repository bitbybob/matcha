const std = @import("std");

pub fn isHomeRelative(input: []const u8) bool {
    return std.mem.eql(u8, input, "~") or
        std.mem.startsWith(u8, input, "~/") or
        std.mem.startsWith(u8, input, "~\\");
}

pub fn hasParentDirectory(input: []const u8) bool {
    return std.mem.lastIndexOfAny(u8, input, "/\\") != null;
}

test "detects home-relative paths" {
    try std.testing.expect(isHomeRelative("~"));
    try std.testing.expect(isHomeRelative("~/plans/input.json"));
    try std.testing.expect(!isHomeRelative("/tmp/input.json"));
}

test "detects parent directories" {
    try std.testing.expect(hasParentDirectory("dist/plan.html"));
    try std.testing.expect(!hasParentDirectory("plan.html"));
}
