const std = @import("std");

const assets = @import("assets.zig");
const path = @import("path.zig");
const render_html = @import("render_html.zig");
const render_markdown = @import("render_markdown.zig");

pub const version = "0.1.0-zig";

pub const ExitCode = enum(u8) {
    ok = 0,
    usage = 1,
    failure = 2,
};

pub fn run(init: std.process.Init) !void {
    var stdout_buffer: [1024]u8 = undefined;
    var stdout_file_writer: std.Io.File.Writer = .init(.stdout(), init.io, &stdout_buffer);
    const stdout = &stdout_file_writer.interface;

    try writeVersion(stdout);
    try stdout.flush();
}

pub fn writeVersion(writer: *std.Io.Writer) std.Io.Writer.Error!void {
    try writer.print("matcha {s}\n", .{version});
}

test "command module imports all CLI responsibility modules" {
    try std.testing.expectEqualStrings("plan.js", assets.plan_js.name);
    try std.testing.expect(path.isHomeRelative("~/sample_plan.json"));
    try std.testing.expectEqualStrings("dist/plan.html", render_html.defaultOutput(.plan));
    try std.testing.expectEqualStrings("# ", render_markdown.headingPrefix(.plan));
}
