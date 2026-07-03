const std = @import("std");

pub const RenderTarget = enum {
    plan,
    map,
};

pub fn defaultInput(target: RenderTarget) []const u8 {
    return switch (target) {
        .plan => "sample_plan.json",
        .map => "sample_map.json",
    };
}

pub fn defaultOutput(target: RenderTarget) []const u8 {
    return switch (target) {
        .plan => "dist/plan.html",
        .map => "dist/map.html",
    };
}

test "html renderer defaults match current CLI" {
    try std.testing.expectEqualStrings("sample_plan.json", defaultInput(.plan));
    try std.testing.expectEqualStrings("dist/map.html", defaultOutput(.map));
}
