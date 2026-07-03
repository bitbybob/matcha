const std = @import("std");

pub const AssetKind = enum {
    plan_js,
    plan_css,
    plan_components_css,
    map_js,
    map_css,
    theme_css,
    llm_output_format,
    llm_uml_output_format,
};

pub fn assetName(kind: AssetKind) []const u8 {
    return switch (kind) {
        .plan_js => "plan.js",
        .plan_css => "plan.css",
        .plan_components_css => "plan-components.css",
        .map_js => "map.js",
        .map_css => "map.css",
        .theme_css => "themes",
        .llm_output_format => "llm_output_format.txt",
        .llm_uml_output_format => "llm_uml_output_format.txt",
    };
}

test "asset names remain explicit" {
    try std.testing.expectEqualStrings("plan.js", assetName(.plan_js));
    try std.testing.expectEqualStrings("themes", assetName(.theme_css));
}
