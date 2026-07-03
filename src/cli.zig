const std = @import("std");

const assets = @import("assets.zig");
const path = @import("path.zig");
const render_html = @import("render_html.zig");
const render_markdown = @import("render_markdown.zig");

pub const version = "0.1.0";

pub const ExitCode = enum(u8) {
    ok = 0,
    usage = 1,
    failure = 2,
};

pub fn run(init: std.process.Init) !void {
    const argv = try init.minimal.args.toSlice(init.arena.allocator());
    const args = if (argv.len > 0) argv[1..] else argv;

    var stdout_buffer: [8192]u8 = undefined;
    var stdout_file_writer: std.Io.File.Writer = .init(.stdout(), init.io, &stdout_buffer);
    const stdout = &stdout_file_writer.interface;

    var stderr_buffer: [1024]u8 = undefined;
    var stderr_file_writer: std.Io.File.Writer = .init(.stderr(), init.io, &stderr_buffer);
    const stderr = &stderr_file_writer.interface;

    const exit_code = try runArgs(args, stdout, stderr);
    try stdout.flush();
    try stderr.flush();

    if (exit_code != .ok) {
        std.process.exit(@intFromEnum(exit_code));
    }
}

pub fn runArgs(args: []const []const u8, stdout: *std.Io.Writer, stderr: *std.Io.Writer) !ExitCode {
    const command = if (args.len > 0) args[0] else "";

    if (isHelpCommand(command)) {
        try writeHelp(stdout);
        return .ok;
    }

    if (isVersionCommand(command)) {
        try writeVersion(stdout);
        return .ok;
    }

    if (std.mem.eql(u8, command, "usage")) {
        try writeUsageGuide(stdout);
        return .ok;
    }

    try writeHelp(stdout);
    try stdout.writeByte('\n');
    try stderr.print("Unknown command: {s}\n", .{command});
    return .usage;
}

fn isHelpCommand(command: []const u8) bool {
    return std.mem.eql(u8, command, "help") or
        std.mem.eql(u8, command, "--help") or
        std.mem.eql(u8, command, "-h");
}

fn isVersionCommand(command: []const u8) bool {
    return std.mem.eql(u8, command, "version") or
        std.mem.eql(u8, command, "--version") or
        std.mem.eql(u8, command, "-V");
}

pub fn writeVersion(writer: *std.Io.Writer) std.Io.Writer.Error!void {
    try writer.print("matcha {s}\n", .{version});
}

pub fn writeHelp(writer: *std.Io.Writer) std.Io.Writer.Error!void {
    try writer.writeAll(
        \\matcha
        \\
        \\Usage:
        \\  matcha [command] [options]
        \\
        \\Commands:
        \\  help, --help, -h  Show this help text
        \\  usage            Explain CLI usage and input formats for LLMs
        \\  version          Show the CLI version
        \\  plan             Render a plan based on the given input
        \\  map              Render a map based on the given input
        \\
        \\Plan commands:
        \\  matcha plan --help              Show detailed help for plan rendering
        \\  matcha plan read <path>         Print a matcha plan as Markdown to stdout
        \\
        \\Map commands:
        \\  matcha map --help               Show detailed help for map rendering
        \\
        \\Options:
        \\  -i, --input <path>    JSON file to render
        \\  -o, --output <path>   HTML file to write
        \\
    );
}

pub fn writeUsageGuide(writer: *std.Io.Writer) std.Io.Writer.Error!void {
    try writer.writeAll(
        \\matcha usage for LLMs
        \\
        \\Purpose:
        \\  matcha turns structured JSON into self-contained HTML artifacts.
        \\  Use "matcha plan" for implementation plans.
        \\  Use "matcha map" for semantic UML-style diagrams.
        \\
        \\Commands:
        \\  matcha plan --input path/to/plan.json --output path/to/plan.html
        \\  matcha map --input path/to/map.json --output path/to/map.html
        \\  matcha plan read path/to/plan.json          Print Markdown to stdout
        \\  matcha plan read path/to/plan.html          Read a matcha-generated plan HTML back as Markdown
        \\
        \\Defaults:
        \\  matcha plan reads sample_plan.json and writes dist/plan.html.
        \\  matcha map reads sample_map.json and writes dist/map.html.
        \\
        \\Path rules:
        \\  --input is a JSON file matching the selected command format.
        \\  --output is the HTML file to write.
        \\  Parent directories for --output are created automatically.
        \\  Quoted home paths such as "~/clankers/file.html" are expanded by matcha.
        \\
        \\LLM workflow:
        \\  1. Decide whether the requested artifact is a plan or map.
        \\  2. Produce exactly one valid JSON object matching the format below.
        \\  3. Save that JSON to a file.
        \\  4. Run the matching matcha command with --input and --output.
        \\  5. Do not put Markdown fences or commentary in the JSON input file.
        \\  6. To read an existing plan as Markdown, run `matcha plan read <path>`.
        \\  7. No --output option exists for plan read; redirect stdout (`> plan.md`) or pipe it.
        \\
        \\Reading plans as Markdown:
        \\  Use `matcha plan read` when you need to consume an existing plan without parsing JSON or
        \\  scraping rendered HTML. The command is deterministic, offline, and writes to stdout only.
        \\
        \\Plan input format:
        \\
    );
    try writeIndentedTrimmed(writer, assets.llm_output_format.contents);
    try writer.writeAll(
        \\
        \\Map input format:
        \\
    );
    try writeIndentedTrimmed(writer, assets.llm_uml_output_format.contents);
    try writer.writeByte('\n');
}

fn writeIndentedTrimmed(writer: *std.Io.Writer, text: []const u8) std.Io.Writer.Error!void {
    const trimmed = std.mem.trim(u8, text, " \t\r\n");
    var lines = std.mem.splitScalar(u8, trimmed, '\n');
    while (lines.next()) |line| {
        try writer.writeAll("  ");
        try writer.writeAll(std.mem.trim(u8, line, "\r"));
        try writer.writeByte('\n');
    }
}

test "command module imports all CLI responsibility modules" {
    try std.testing.expectEqualStrings("plan.js", assets.plan_js.name);
    try std.testing.expect(path.isHomeRelative("~/sample_plan.json"));
    try std.testing.expectEqualStrings("dist/plan.html", render_html.defaultOutput(.plan));
    try std.testing.expectEqualStrings("# ", render_markdown.headingPrefix(.plan));
}

test "root help aliases print help" {
    const aliases = [_][]const u8{ "help", "--help", "-h" };

    for (aliases) |alias| {
        var stdout_buffer: [2048]u8 = undefined;
        var stderr_buffer: [128]u8 = undefined;
        var stdout: std.Io.Writer = .fixed(&stdout_buffer);
        var stderr: std.Io.Writer = .fixed(&stderr_buffer);
        const code = try runArgs(&.{alias}, &stdout, &stderr);
        const output = stdout_buffer[0..stdout.end];

        try std.testing.expectEqual(ExitCode.ok, code);
        try std.testing.expect(std.mem.indexOf(u8, output, "matcha plan --help") != null);
        try std.testing.expect(std.mem.indexOf(u8, output, "matcha map --help") != null);
        try std.testing.expect(std.mem.indexOf(u8, output, "help, --help, -h") != null);
        try std.testing.expectEqual(@as(usize, 0), stderr.end);
    }
}

test "root version aliases print current CLI version" {
    const aliases = [_][]const u8{ "version", "--version", "-V" };

    for (aliases) |alias| {
        var stdout_buffer: [64]u8 = undefined;
        var stderr_buffer: [128]u8 = undefined;
        var stdout: std.Io.Writer = .fixed(&stdout_buffer);
        var stderr: std.Io.Writer = .fixed(&stderr_buffer);
        const code = try runArgs(&.{alias}, &stdout, &stderr);

        try std.testing.expectEqual(ExitCode.ok, code);
        try std.testing.expectEqualStrings("matcha 0.1.0\n", stdout_buffer[0..stdout.end]);
        try std.testing.expectEqual(@as(usize, 0), stderr.end);
    }
}

test "usage includes embedded plan and map format instructions" {
    var stdout_buffer: [32768]u8 = undefined;
    var stderr_buffer: [128]u8 = undefined;
    var stdout: std.Io.Writer = .fixed(&stdout_buffer);
    var stderr: std.Io.Writer = .fixed(&stderr_buffer);
    const code = try runArgs(&.{"usage"}, &stdout, &stderr);
    const output = stdout_buffer[0..stdout.end];

    try std.testing.expectEqual(ExitCode.ok, code);
    try std.testing.expect(std.mem.indexOf(u8, output, "matcha usage for LLMs") != null);
    try std.testing.expect(std.mem.indexOf(u8, output, "Plan input format:") != null);
    try std.testing.expect(std.mem.indexOf(u8, output, "  Plan input format") != null);
    try std.testing.expect(std.mem.indexOf(u8, output, "Map input format:") != null);
    try std.testing.expect(std.mem.indexOf(u8, output, "  Map input format") != null);
    try std.testing.expectEqual(@as(usize, 0), stderr.end);
}
