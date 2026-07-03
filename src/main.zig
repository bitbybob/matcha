const std = @import("std");
const matcha = @import("matcha");

pub fn main(init: std.process.Init) !void {
    var stdout_buffer: [1024]u8 = undefined;
    var stdout_file_writer: std.Io.File.Writer = .init(.stdout(), init.io, &stdout_buffer);
    const stdout = &stdout_file_writer.interface;

    try matcha.writeVersion(stdout);
    try stdout.flush();
}

test "imports root cli module" {
    try std.testing.expect(matcha.version.len > 0);
}
