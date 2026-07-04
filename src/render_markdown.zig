const std = @import("std");

pub const MarkdownFormat = enum {
    plan,
};

pub const RenderError = error{ NotAnObject, OutOfMemory };

pub fn headingPrefix(format: MarkdownFormat) []const u8 {
    return switch (format) {
        .plan => "# ",
    };
}

pub fn renderPlanMarkdown(allocator: std.mem.Allocator, plan_value: std.json.Value) RenderError![]const u8 {
    if (plan_value != .object) {
        return RenderError.NotAnObject;
    }

    var out = try std.ArrayList(u8).initCapacity(allocator, 0);
    errdefer out.deinit(allocator);
    var writer = MarkdownWriter{ .out = &out, .allocator = allocator };

    try renderPlan(&writer, plan_value.object);
    try writer.writeLine("");

    const raw = try out.toOwnedSlice(allocator);
    return raw;
}

const MarkdownWriter = struct {
    out: *std.ArrayList(u8),
    allocator: std.mem.Allocator,
    last_line_blank: bool = false,

    fn writeLine(self: *MarkdownWriter, line: []const u8) !void {
        const current_line_blank = line.len == 0;
        if (current_line_blank and self.last_line_blank) {
            return;
        }

        try self.out.appendSlice(self.allocator, line);
        try self.out.append(self.allocator, '\n');
        self.last_line_blank = current_line_blank;
    }

    fn writeKVLine(self: *MarkdownWriter, comptime fmt: []const u8, value: []const u8) !void {
        const rendered = try std.fmt.allocPrint(self.allocator, fmt, .{value});
        defer self.allocator.free(rendered);
        try self.writeLine(rendered);
    }

    fn writeFormattedLine(self: *MarkdownWriter, comptime fmt: []const u8, value: anytype) !void {
        const rendered = try std.fmt.allocPrint(self.allocator, fmt, value);
        defer self.allocator.free(rendered);
        try self.writeLine(rendered);
    }
};

fn renderPlan(out: *MarkdownWriter, plan: std.json.ObjectMap) !void {
    const title = getString(plan, "title") orelse "";

    try out.writeFormattedLine("# {s}", .{title});
    try out.writeLine("");
    try out.writeKVLine("- **Plan ID:** {s}", getString(plan, "id") orelse "");

    if (getString(plan, "project")) |project| {
        try out.writeKVLine("- **Project:** {s}", project);
    }

    if (getString(plan, "status")) |status| {
        try out.writeKVLine("- **Status:** {s}", status);
    }

    if (getString(plan, "generatedAt")) |generated_at| {
        try out.writeKVLine("- **Generated At:** {s}", generated_at);
    }

    if (plan.get("schemaVersion")) |schema_version| {
        const schema_version_text = try renderJsonValue(out.allocator, schema_version);
        defer out.allocator.free(schema_version_text);
        try out.writeFormattedLine("- **Schema Version:** {s}", .{schema_version_text});
    }

    if (getString(plan, "scope")) |scope| {
        try out.writeLine("");
        try out.writeLine("## Scope");
        try out.writeLine("");
        try out.writeLine(scope);
    }

    if (getArray(plan, "summary")) |summary| {
        if (summary.items.len > 0) {
            try out.writeLine("");
            try out.writeLine("## Summary");
            try out.writeLine("");

            for (summary.items) |summary_item| {
                if (summary_item == .string) {
                    try out.writeLine(summary_item.string);
                    try out.writeLine("");
                }
            }
        }
    }

    if (getObject(plan, "metadata")) |metadata| {
        if (metadata.count() > 0) {
            try out.writeLine("## Metadata");
            try out.writeLine("");

            const keys = try sortedKeys(out.allocator, metadata);
            defer out.allocator.free(keys);
            for (keys) |key| {
                const metadata_value = metadata.get(key) orelse continue;
                const rendered = try renderJsonValue(out.allocator, metadata_value);
                defer out.allocator.free(rendered);
                try out.writeFormattedLine("- **{s}:** {s}", .{ key, rendered });
            }

            try out.writeLine("");
        }
    }

    if (getArray(plan, "epics")) |epics| {
        if (epics.items.len > 0) {
            try out.writeLine("## Epics");
            try out.writeLine("");

            for (epics.items) |epic| {
                if (epic == .object) {
                    try renderEpic(out, epic.object);
                }
            }
        }
    }
}

fn renderEpic(out: *MarkdownWriter, epic: std.json.ObjectMap) !void {
    const id = getString(epic, "id") orelse "";
    const title = getString(epic, "title") orelse "";

    try out.writeFormattedLine("### {s}: {s}", .{ id, title });

    if (getString(epic, "summary")) |summary| {
        try out.writeLine("");
        try out.writeLine(summary);
    }

    if (getString(epic, "status")) |status| {
        try out.writeLine("");
        try out.writeKVLine("- **Status:** {s}", status);
    }

    if (getStringList(epic, "tags", out.allocator)) |tags| {
        defer out.allocator.free(tags);
        const tags_text = try joinPrefixComma(out.allocator, "- **Tags:** ", tags);
        defer out.allocator.free(tags_text);
        try out.writeLine(tags_text);
    }

    if (getString(epic, "testFocus")) |test_focus| {
        try out.writeKVLine("- **Test Focus:** {s}", test_focus);
    }

    if (getStringList(epic, "dependencies", out.allocator)) |dependencies| {
        defer out.allocator.free(dependencies);
        const dependencies_text = try joinPrefixComma(out.allocator, "- **Dependencies:** ", dependencies);
        defer out.allocator.free(dependencies_text);
        try out.writeLine(dependencies_text);
    }

    const stories = getArray(epic, "stories");
    if (stories != null and stories.?.items.len > 0) {
        try out.writeLine("");
        try out.writeLine("#### Stories");
        try out.writeLine("");

        for (stories.?.items) |story| {
            if (story == .object) {
                try renderStory(out, story.object);
            }
        }
    }

    try out.writeLine("");
}

fn renderStory(out: *MarkdownWriter, story: std.json.ObjectMap) !void {
    const id = getString(story, "id") orelse "";
    const title = getString(story, "title") orelse "";
    try out.writeFormattedLine("##### {s}: {s}", .{ id, title });

    if (getString(story, "status")) |status| {
        try out.writeLine("");
        try out.writeKVLine("- **Status:** {s}", status);
    }

    if (getU64(story, "priority")) |priority| {
        try out.writeFormattedLine("- **Priority:** {d}", .{priority});
    }

    if (getString(story, "risk")) |risk| {
        try out.writeKVLine("- **Risk:** {s}", risk);
    }

    if (getString(story, "owner")) |owner| {
        try out.writeKVLine("- **Owner:** {s}", owner);
    }

    if (story.get("estimate")) |estimate| {
        if (estimate != .null) {
            const estimate_text = try renderJsonValue(out.allocator, estimate);
            defer out.allocator.free(estimate_text);
            try out.writeFormattedLine("- **Estimate:** {s}", .{estimate_text});
        }
    }

    if (getStringList(story, "tags", out.allocator)) |tags| {
        defer out.allocator.free(tags);
        const tags_text = try joinPrefixComma(out.allocator, "- **Tags:** ", tags);
        defer out.allocator.free(tags_text);
        try out.writeLine(tags_text);
    }

    if (getStringList(story, "dependencies", out.allocator)) |dependencies| {
        defer out.allocator.free(dependencies);
        const dependencies_text = try joinPrefixComma(out.allocator, "- **Dependencies:** ", dependencies);
        defer out.allocator.free(dependencies_text);
        try out.writeLine(dependencies_text);
    }

    if (getStringList(story, "details", out.allocator)) |details| {
        defer out.allocator.free(details);
        try out.writeLine("");
        try out.writeLine("**Details:**");
        try out.writeLine("");

        for (details) |detail| {
            try out.writeFormattedLine("- {s}", .{detail});
        }
    }

    if (getStringList(story, "acceptanceCriteria", out.allocator)) |acceptance| {
        defer out.allocator.free(acceptance);
        try out.writeLine("");
        try out.writeLine("**Acceptance Criteria:**");
        try out.writeLine("");

        for (acceptance) |criterion| {
            try out.writeFormattedLine("- {s}", .{criterion});
        }
    }

    if (getStringList(story, "unitTests", out.allocator)) |unit_tests| {
        defer out.allocator.free(unit_tests);
        try out.writeLine("");
        try out.writeLine("**Unit Tests:**");
        try out.writeLine("");

        for (unit_tests) |unit| {
            try out.writeFormattedLine("- {s}", .{unit});
        }
    }

    if (getStringList(story, "filesLikelyTouched", out.allocator)) |files| {
        defer out.allocator.free(files);
        try out.writeLine("");
        try out.writeLine("**Files Likely Touched:**");
        try out.writeLine("");

        for (files) |file| {
            const escaped = try escapeInlineCode(out.allocator, file);
            defer out.allocator.free(escaped);
            try out.writeFormattedLine("- {s}", .{escaped});
        }
    }

    if (getStringList(story, "commandsToRun", out.allocator)) |commands| {
        defer out.allocator.free(commands);
        try out.writeLine("");
        try out.writeLine("**Commands to Run:**");
        try out.writeLine("");

        for (commands) |command| {
            try out.writeLine("```sh");
            try out.writeLine(command);
            try out.writeLine("```");
        }
    }

    if (getStringList(story, "artifacts", out.allocator)) |artifacts| {
        defer out.allocator.free(artifacts);
        try out.writeLine("");
        try out.writeLine("**Artifacts:**");
        try out.writeLine("");

        for (artifacts) |artifact| {
            try out.writeFormattedLine("- {s}", .{artifact});
        }
    }

    if (getStringList(story, "notes", out.allocator)) |notes| {
        defer out.allocator.free(notes);
        try out.writeLine("");
        try out.writeLine("**Notes:**");
        try out.writeLine("");

        for (notes) |note| {
            try out.writeFormattedLine("- {s}", .{note});
        }
    }

    try out.writeLine("");
}

fn getString(container: std.json.ObjectMap, key: []const u8) ?[]const u8 {
    const value = container.get(key) orelse return null;
    return if (value == .string) value.string else null;
}

fn getArray(container: std.json.ObjectMap, key: []const u8) ?std.json.Array {
    const value = container.get(key) orelse return null;
    return if (value == .array) value.array else null;
}

fn getObject(container: std.json.ObjectMap, key: []const u8) ?std.json.ObjectMap {
    const value = container.get(key) orelse return null;
    return if (value == .object) value.object else null;
}

fn getU64(container: std.json.ObjectMap, key: []const u8) ?u64 {
    const value = container.get(key) orelse return null;

    return switch (value) {
        .integer => |integer| if (integer >= 0) @intCast(integer) else null,
        else => null,
    };
}

fn getStringList(container: std.json.ObjectMap, key: []const u8, allocator: std.mem.Allocator) ?[][]const u8 {
    const array = getArray(container, key) orelse return null;
    if (array.items.len == 0) return null;

    var strings = (std.ArrayList([]const u8).initCapacity(allocator, 0) catch return null);
    defer strings.deinit(allocator);

    for (array.items) |value| {
        if (value == .string) {
            strings.append(allocator, value.string) catch return null;
        }
    }

    if (strings.items.len == 0) return null;

    return strings.toOwnedSlice(allocator) catch return null;
}

fn joinPrefixComma(allocator: std.mem.Allocator, prefix: []const u8, values: []const []const u8) ![]const u8 {
    var result = try std.ArrayList(u8).initCapacity(allocator, 0);
    defer result.deinit(allocator);
    try result.appendSlice(allocator, prefix);

    for (values, 0..) |value, index| {
        if (index > 0) {
            try result.appendSlice(allocator, ", ");
        }

        try result.appendSlice(allocator, value);
    }

    const owned = try result.toOwnedSlice(allocator);
    return owned;
}

fn sortedKeys(allocator: std.mem.Allocator, object: std.json.ObjectMap) ![][]const u8 {
    var keys = try std.ArrayList([]const u8).initCapacity(allocator, 0);
    errdefer keys.deinit(allocator);

    var it = object.iterator();
    while (it.next()) |entry| {
        try keys.append(allocator, entry.key_ptr.*);
    }

    std.mem.sort([]const u8, keys.items, {}, struct {
        fn lessThan(_: void, lhs: []const u8, rhs: []const u8) bool {
            return std.mem.lessThan(u8, lhs, rhs);
        }
    }.lessThan);

    return try keys.toOwnedSlice(allocator);
}

fn renderJsonValue(allocator: std.mem.Allocator, value: std.json.Value) ![]const u8 {
    var out = try std.ArrayList(u8).initCapacity(allocator, 0);
    errdefer out.deinit(allocator);

    switch (value) {
        .null => try out.appendSlice(allocator, "null"),
        .bool => |bool_value| try out.appendSlice(allocator, if (bool_value) "true" else "false"),
        .integer => |integer| {
            const text = try std.fmt.allocPrint(allocator, "{}", .{integer});
            defer allocator.free(text);
            try out.appendSlice(allocator, text);
        },
        .float => |float_value| {
            const text = try std.fmt.allocPrint(allocator, "{}", .{float_value});
            defer allocator.free(text);
            try out.appendSlice(allocator, text);
        },
        .number_string => |string_number| try out.appendSlice(allocator, string_number),
        .string => |string_value| try out.appendSlice(allocator, string_value),
        .array => |array| {
            for (array.items, 0..) |item, index| {
                if (index > 0) {
                    try out.appendSlice(allocator, ", ");
                }

                const rendered = try renderJsonValue(allocator, item);
                defer allocator.free(rendered);
                try out.appendSlice(allocator, rendered);
            }
        },
        .object => |object| {
            const keys = try sortedKeys(allocator, object);
            defer allocator.free(keys);

            for (keys, 0..) |key, index| {
                if (index > 0) {
                    try out.appendSlice(allocator, ", ");
                }

                const rendered_value = try renderJsonValue(allocator, object.get(key) orelse .null);
                defer allocator.free(rendered_value);
                const rendered_entry = try std.fmt.allocPrint(allocator, "{s}: {s}", .{ key, rendered_value });
                defer allocator.free(rendered_entry);
                try out.appendSlice(allocator, rendered_entry);
            }
        },
    }

    return try out.toOwnedSlice(allocator);
}

fn escapeInlineCode(allocator: std.mem.Allocator, input: []const u8) ![]const u8 {
    return std.mem.replaceOwned(u8, allocator, input, "`", "\\`");
}

fn parseJsonValue(allocator: std.mem.Allocator, text: []const u8) !std.json.Parsed(std.json.Value) {
    return std.json.parseFromSlice(std.json.Value, allocator, text, .{});
}

test "markdown renderer exposes plan heading prefix" {
    try std.testing.expectEqualStrings("# ", headingPrefix(.plan));
}

test "renders minimal plan and top-level fields" {
    const allocator = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();

    const parsed = try parseJsonValue(arena.allocator(), "{\"schemaVersion\":1,\"id\":\"minimal\",\"title\":\"Minimal Plan\"}");
    defer parsed.deinit();

    const markdown = try renderPlanMarkdown(allocator, parsed.value);
    defer allocator.free(markdown);

    try std.testing.expect(std.mem.indexOf(u8, markdown, "# Minimal Plan") != null);
    try std.testing.expect(std.mem.indexOf(u8, markdown, "- **Plan ID:** minimal") != null);
    try std.testing.expect(std.mem.indexOf(u8, markdown, "- **Schema Version:** 1") != null);
    try std.testing.expect(std.mem.indexOf(u8, markdown, "\n\n\n") == null);
}

test "renders metadata key order deterministically" {
    const allocator = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();

    const parsed = try parseJsonValue(
        arena.allocator(),
        "{\"schemaVersion\":1,\"id\":\"ordered\",\"title\":\"Ordered Plan\",\"metadata\":{\"z\":1,\"a\":2,\"m\":3}}",
    );
    defer parsed.deinit();

    const markdown = try renderPlanMarkdown(allocator, parsed.value);
    defer allocator.free(markdown);

    const idx_a = std.mem.indexOf(u8, markdown, "- **a:** 2") orelse return error.TestUnexpectedResult;
    const idx_m = std.mem.indexOf(u8, markdown, "- **m:** 3") orelse return error.TestUnexpectedResult;
    const idx_z = std.mem.indexOf(u8, markdown, "- **z:** 1") orelse return error.TestUnexpectedResult;

    try std.testing.expect(idx_a < idx_m);
    try std.testing.expect(idx_m < idx_z);
}

test "renders epics and stories with core fields" {
    const allocator = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();

    const parsed = try parseJsonValue(arena.allocator(), "{\"schemaVersion\":1,\"id\":\"epics\",\"title\":\"Epic Story Plan\",\"epics\":[{\"id\":\"E1\",\"title\":\"Epic One\",\"summary\":\"Epic summary.\",\"status\":\"in-progress\",\"tags\":[\"cli\"],\"testFocus\":\"Argument parsing\",\"dependencies\":[\"E2\"],\"stories\":[{\"id\":\"E1.S1\",\"title\":\"Story One\",\"status\":\"planned\",\"priority\":1,\"risk\":\"low\",\"owner\":\"agent\",\"estimate\":\"2h\",\"tags\":[\"parser\"],\"dependencies\":[\"E1.S2\"],\"details\":[\"Detail one.\"],\"acceptanceCriteria\":[\"Criterion one.\"],\"unitTests\":[\"Test one.\"],\"filesLikelyTouched\":[\"src/mod.ts\"],\"commandsToRun\":[\"task test\"],\"artifacts\":[\"dist/matcha\"],\"notes\":[\"Note one.\"]}]}] }");
    defer parsed.deinit();

    const markdown = try renderPlanMarkdown(allocator, parsed.value);
    defer allocator.free(markdown);

    for ([_][]const u8{
        "## Epics",
        "### E1: Epic One",
        "Epic summary.",
        "- **Status:** in-progress",
        "- **Tags:** cli",
        "- **Test Focus:** Argument parsing",
        "- **Dependencies:** E2",
        "#### Stories",
        "##### E1.S1: Story One",
        "- **Status:** planned",
        "- **Priority:** 1",
        "- **Risk:** low",
        "- **Owner:** agent",
        "- **Estimate:** 2h",
        "- **Tags:** parser",
        "- **Dependencies:** E1.S2",
        "**Details:**",
        "- Detail one.",
        "**Acceptance Criteria:**",
        "- Criterion one.",
        "**Unit Tests:**",
        "- Test one.",
        "**Files Likely Touched:**",
        "- src/mod.ts",
        "**Commands to Run:**",
        "```sh",
        "task test",
        "```",
        "**Artifacts:**",
        "- dist/matcha",
        "**Notes:**",
        "- Note one.",
    }) |expected| {
        try std.testing.expect(std.mem.indexOf(u8, markdown, expected) != null);
    }
}

test "renders deterministic nested json values" {
    const allocator = std.testing.allocator;
    var arena = std.heap.ArenaAllocator.init(allocator);
    defer arena.deinit();

    const parsed = try parseJsonValue(arena.allocator(), "{\"schemaVersion\":1,\"id\":\"nested\",\"title\":\"Nested Plan\",\"metadata\":{\"matrix\":[1,2,{\"b\":3,\"a\":1}],\"flag\":true,\"none\":null,\"obj\":{\"z\":0,\"a\":1}}}");
    defer parsed.deinit();

    const markdown = try renderPlanMarkdown(allocator, parsed.value);
    defer allocator.free(markdown);

    try std.testing.expect(std.mem.indexOf(u8, markdown, "- **flag:** true") != null);
    try std.testing.expect(std.mem.indexOf(u8, markdown, "- **none:** null") != null);
    const obj_start = std.mem.indexOf(u8, markdown, "- **obj:**") orelse return error.TestUnexpectedResult;
    const obj_line_end = std.mem.indexOfScalarPos(u8, markdown, obj_start, '\n') orelse markdown.len;
    const obj_line = markdown[obj_start..obj_line_end];
    const a_pos = std.mem.indexOf(u8, obj_line, "a: 1") orelse return error.TestUnexpectedResult;
    const z_pos = std.mem.indexOf(u8, obj_line, "z: 0") orelse return error.TestUnexpectedResult;
    try std.testing.expect(a_pos < z_pos);
}
