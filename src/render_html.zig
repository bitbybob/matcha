const std = @import("std");

const assets = @import("assets.zig");

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

pub fn writePlanHtml(io: std.Io, output_path: []const u8, title: []const u8, payload: []const u8) !void {
    const file = try std.Io.Dir.cwd().createFile(io, output_path, .{ .truncate = true });
    defer file.close(io);

    try file.writeStreamingAll(io, "<!DOCTYPE html>\n");
    try file.writeStreamingAll(io, "<html lang=\"en\" data-theme=\"catppuccin-latte\">\n");
    try file.writeStreamingAll(io, "<head>\n");
    try file.writeStreamingAll(io, "  <title>");
    try file.writeStreamingAll(io, title);
    try file.writeStreamingAll(io, "</title>\n");
    try file.writeStreamingAll(io, "  <meta charset=\"UTF-8\">\n");
    try writeThemeBootScript(io, file, "matcha-plan-theme");
    try file.writeStreamingAll(io, "\n  <style>");
    for (assets.themes) |theme_asset| {
        try file.writeStreamingAll(io, theme_asset.css);
        try file.writeStreamingAll(io, "\n");
    }
    try file.writeStreamingAll(io, "</style>\n");
    try file.writeStreamingAll(io, "  <style>");
    try writeStyle(io, file, &assets.plan_css);
    try file.writeStreamingAll(io, "</style>\n");
    try file.writeStreamingAll(io, "  <style>");
    try writeStyle(io, file, &assets.plan_components_css);
    try file.writeStreamingAll(io, "</style>\n");
    try file.writeStreamingAll(io, "</head>\n");

    try file.writeStreamingAll(io, "<body>\n");
    try file.writeStreamingAll(io, "  <aside id=\"sidebar\"></aside>\n");
    try file.writeStreamingAll(io, "  <main id=\"content-area\"></main>\n");
    try file.writeStreamingAll(io, "  <script type=\"application/json\" id=\"plan-data\">\n");
    try writeEmbeddedJson(io, file, payload);
    try file.writeStreamingAll(io, "\n  </script>\n");
    try file.writeStreamingAll(io, "  <script>\n");
    try file.writeStreamingAll(io, "    window.PLAN_DATA = JSON.parse(document.getElementById(\"plan-data\").textContent);\n");
    try file.writeStreamingAll(io, "    ;\n");
    try file.writeStreamingAll(io, assets.plan_js.contents);
    try file.writeStreamingAll(io, "\n  </script>\n");
    try file.writeStreamingAll(io, "</body>\n");
    try file.writeStreamingAll(io, "</html>\n");
}

pub fn writeMapHtml(io: std.Io, output_path: []const u8, title: []const u8, payload: []const u8) !void {
    const file = try std.Io.Dir.cwd().createFile(io, output_path, .{ .truncate = true });
    defer file.close(io);

    try file.writeStreamingAll(io, "<!DOCTYPE html>\n");
    try file.writeStreamingAll(io, "<html lang=\"en\" data-theme=\"catppuccin-latte\">\n");
    try file.writeStreamingAll(io, "<head>\n");
    try file.writeStreamingAll(io, "  <title>");
    try file.writeStreamingAll(io, title);
    try file.writeStreamingAll(io, "</title>\n");
    try file.writeStreamingAll(io, "  <meta charset=\"UTF-8\">\n");
    try file.writeStreamingAll(io, "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
    try writeThemeBootScript(io, file, "matcha-map-theme");
    try file.writeStreamingAll(io, "\n  <style>");
    for (assets.themes) |theme_asset| {
        try file.writeStreamingAll(io, theme_asset.css);
        try file.writeStreamingAll(io, "\n");
    }
    try file.writeStreamingAll(io, "</style>\n");
    try file.writeStreamingAll(io, "  <style>");
    try writeStyle(io, file, &assets.map_css);
    try file.writeStreamingAll(io, "</style>\n");
    try file.writeStreamingAll(io, "</head>\n");

    try file.writeStreamingAll(io, "<body>\n");
    try file.writeStreamingAll(io, "  <div id=\"map-root\"></div>\n");
    try file.writeStreamingAll(io, "  <script type=\"application/json\" id=\"map-data\">\n");
    try writeEmbeddedJson(io, file, payload);
    try file.writeStreamingAll(io, "\n  </script>\n");
    try file.writeStreamingAll(io, "  <script>\n");
    try file.writeStreamingAll(io, "    window.MAP_DATA = JSON.parse(document.getElementById(\"map-data\").textContent);\n");
    try file.writeStreamingAll(io, "    ;\n");
    try file.writeStreamingAll(io, assets.map_js.contents);
    try file.writeStreamingAll(io, "\n  </script>\n");
    try file.writeStreamingAll(io, "</body>\n");
    try file.writeStreamingAll(io, "</html>\n");
}

fn writeEmbeddedJson(io: std.Io, file: std.Io.File, payload: []const u8) !void {
    for (payload, 0..) |byte, index| {
        if (byte == '<') {
            try file.writeStreamingAll(io, "\\u003c");
        } else {
            try file.writeStreamingAll(io, payload[index .. index + 1]);
        }
    }
}

fn writeStyle(io: std.Io, file: std.Io.File, text_asset: *const assets.TextAsset) !void {
    try file.writeStreamingAll(io, text_asset.contents);
}

fn writeThemeBootScript(io: std.Io, file: std.Io.File, storage_key: []const u8) !void {
    try file.writeStreamingAll(io, "<script>\n");
    try file.writeStreamingAll(io, "  (function () {\n");
    try file.writeStreamingAll(io, "    var themes = new Set([");
    for (assets.themes, 0..) |theme_asset, index| {
        if (index > 0) {
            try file.writeStreamingAll(io, ",");
        }
        try file.writeStreamingAll(io, "\"");
        try file.writeStreamingAll(io, theme_asset.name);
        try file.writeStreamingAll(io, "\"");
    }
    try file.writeStreamingAll(io, "]);\n");
    try file.writeStreamingAll(io, "    try {\n");
    try file.writeStreamingAll(io, "      var saved = localStorage.getItem(\"");
    try file.writeStreamingAll(io, storage_key);
    try file.writeStreamingAll(io, "\");\n");
    try file.writeStreamingAll(io, "      if (themes.has(saved)) {\n");
    try file.writeStreamingAll(io, "        document.documentElement.setAttribute(\"data-theme\", saved);\n");
    try file.writeStreamingAll(io, "      }\n");
    try file.writeStreamingAll(io, "    } catch {}\n");
    try file.writeStreamingAll(io, "  })();\n");
    try file.writeStreamingAll(io, "</script>");
}

test "html renderer defaults match current CLI" {
    try std.testing.expectEqualStrings("sample_plan.json", defaultInput(.plan));
    try std.testing.expectEqualStrings("dist/map.html", defaultOutput(.map));
}

test "plan HTML render emits required markers and title" {
    const allocator = std.testing.allocator;

    var tmp = std.testing.tmpDir(.{});
    defer tmp.cleanup();

    const output_path = try std.fmt.allocPrint(allocator, "{s}/plan.html", .{tmp.dir.path.?});
    defer allocator.free(output_path);

    try writePlanHtml(
        std.testing.io,
        output_path,
        "Plan Fixture",
        "{\"title\":\"Plan Fixture\",\"extra_field\":\"kept\"}",
    );

    var file = try tmp.dir.openFile("plan.html", .{});
    defer file.close();

    const html = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(html);

    try std.testing.expect(std.mem.indexOf(u8, html, "<title>Plan Fixture</title>") != null);
    try std.testing.expect(std.mem.indexOf(u8, html, "<aside id=\"sidebar\"></aside>") != null);
    try std.testing.expect(std.mem.indexOf(u8, html, "<main id=\"content-area\"></main>") != null);
    try std.testing.expect(std.mem.indexOf(u8, html, "id=\"plan-data\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, html, "window.PLAN_DATA") != null);
    try std.testing.expect(std.mem.indexOf(u8, html, "\"extra_field\":\"kept\"") != null);
}

test "plan HTML renderer escapes script-like JSON" {
    const allocator = std.testing.allocator;

    var tmp = std.testing.tmpDir(.{});
    defer tmp.cleanup();

    const output_path = try std.fmt.allocPrint(allocator, "{s}/plan.html", .{tmp.dir.path.?});
    defer allocator.free(output_path);

    try writePlanHtml(
        std.testing.io,
        output_path,
        "</script><script>alert(1)</script>",
        "{\"title\":\"</script><script>alert(1)</script>\"}",
    );

    var file = try tmp.dir.openFile("plan.html", .{});
    defer file.close();

    const html = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(html);

    try std.testing.expect(std.mem.indexOf(u8, html, "\\u003c/script\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e") != null);
    try std.testing.expect(std.mem.indexOf(u8, html, "<script>alert(1)</script>") == null);
}

test "map HTML render emits required markers and title" {
    const allocator = std.testing.allocator;

    var tmp = std.testing.tmpDir(.{});
    defer tmp.cleanup();

    const output_path = try std.fmt.allocPrint(allocator, "{s}/map.html", .{tmp.dir.path.?});
    defer allocator.free(output_path);

    try writeMapHtml(
        std.testing.io,
        output_path,
        "Map Fixture",
        "{\"title\":\"Map Fixture\",\"kind\":\"class\",\"elements\":[]}",
    );

    var file = try tmp.dir.openFile("map.html", .{});
    defer file.close();

    const html = try file.readToEndAlloc(allocator, 1024 * 1024);
    defer allocator.free(html);

    try std.testing.expect(std.mem.indexOf(u8, html, "<title>Map Fixture</title>") != null);
    try std.testing.expect(std.mem.indexOf(u8, html, "<div id=\"map-root\"></div>") != null);
    try std.testing.expect(std.mem.indexOf(u8, html, "id=\"map-data\"") != null);
    try std.testing.expect(std.mem.indexOf(u8, html, "window.MAP_DATA") != null);
}
