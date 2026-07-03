const std = @import("std");
const matcha = @import("matcha");

pub fn main(init: std.process.Init) !void {
    try matcha.cli.run(init);
}

test "imports root cli module" {
    try std.testing.expect(matcha.version.len > 0);
}
