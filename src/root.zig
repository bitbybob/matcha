pub const assets = @import("assets.zig");
pub const cli = @import("cli.zig");
pub const path = @import("path.zig");
pub const render_html = @import("render_html.zig");
pub const render_markdown = @import("render_markdown.zig");

pub const version = cli.version;

test "root cli module exposes placeholder version" {
    const std = @import("std");

    try std.testing.expect(version.len > 0);
}

test "root imports CLI modules without dependency cycles" {
    const std = @import("std");

    try std.testing.expectEqualStrings("map.css", assets.map_css.name);
    try std.testing.expect(path.hasParentDirectory("dist/map.html"));
    try std.testing.expectEqualStrings("sample_map.json", render_html.defaultInput(.map));
    try std.testing.expectEqualStrings("# ", render_markdown.headingPrefix(.plan));
}
