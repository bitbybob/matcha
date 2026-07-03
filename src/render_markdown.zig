const std = @import("std");

pub const MarkdownFormat = enum {
    plan,
};

pub fn headingPrefix(format: MarkdownFormat) []const u8 {
    return switch (format) {
        .plan => "# ",
    };
}

test "markdown renderer exposes plan heading prefix" {
    try std.testing.expectEqualStrings("# ", headingPrefix(.plan));
}
