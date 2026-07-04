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

pub const RenderOptions = struct {
    target: render_html.RenderTarget,
    input: []const u8,
    output: []const u8,
};

pub const CliError = union(enum) {
    missing_value: []const u8,
    unknown_option: []const u8,
    missing_home: []const u8,
    path_error: []const u8,
};

pub const RenderOptionsResult = union(enum) {
    ok: RenderOptions,
    err: CliError,
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

    if (std.mem.eql(u8, command, "plan")) {
        return runRenderCommand(.plan, args[1..], stdout, stderr);
    }

    if (std.mem.eql(u8, command, "map")) {
        return runRenderCommand(.map, args[1..], stdout, stderr);
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

fn runRenderCommand(
    target: render_html.RenderTarget,
    args: []const []const u8,
    stdout: *std.Io.Writer,
    stderr: *std.Io.Writer,
) !ExitCode {
    if (args.len > 0 and isHelpCommand(args[0])) {
        switch (target) {
            .plan => try writePlanHelp(stdout),
            .map => try writeMapHelp(stdout),
        }
        return .ok;
    }

    var options: RenderOptions = switch (parseRenderOptions(target, args)) {
        .ok => |parsed| parsed,
        .err => |cli_error| {
            try writeCliError(stderr, cli_error);
            return .usage;
        },
    };

    switch (normalizeRenderPaths(std.heap.page_allocator, &options)) {
        .ok => {},
        .err => |cli_error| {
            try writeCliError(stderr, cli_error);
            return .usage;
        },
    }

    if (!prepareOutputDirectory(stderr, options.output)) {
        return .failure;
    }

    try stderr.print("Rendering {s} is not implemented in the Zig CLI yet\n", .{renderTargetName(target)});
    return .failure;
}

fn normalizeRenderPaths(allocator: std.mem.Allocator, options: *RenderOptions) RenderOptionsResult {
    options.input = path.expandHomePath(allocator, options.input) catch |err| {
        switch (err) {
            error.MissingHome => return RenderOptionsResult{ .err = .{ .missing_home = options.input } },
            else => return RenderOptionsResult{ .err = .{ .path_error = options.input } },
        }
    };
    options.output = path.expandHomePath(allocator, options.output) catch |err| {
        switch (err) {
            error.MissingHome => return RenderOptionsResult{ .err = .{ .missing_home = options.output } },
            else => return RenderOptionsResult{ .err = .{ .path_error = options.output } },
        }
    };
    return RenderOptionsResult{ .ok = options.* };
}

fn prepareOutputDirectory(stderr: *std.Io.Writer, output: []const u8) bool {
    const output_parent = path.parentDirectory(output) orelse return true;
    std.fs.cwd().makePath(output_parent) catch |err| {
        stderr.print("Cannot create output directory {s}: {s}\n", .{
            output_parent,
            @errorName(err),
        }) catch return false;
        return false;
    };
    return true;
}

pub fn parseRenderOptions(target: render_html.RenderTarget, args: []const []const u8) RenderOptionsResult {
    var options: RenderOptions = .{
        .target = target,
        .input = render_html.defaultInput(target),
        .output = render_html.defaultOutput(target),
    };

    var index: usize = 0;
    while (index < args.len) : (index += 1) {
        const arg = args[index];

        if (std.mem.eql(u8, arg, "--input") or std.mem.eql(u8, arg, "-i")) {
            index += 1;
            options.input = readFlagValue(args, index) orelse return .{ .err = .{ .missing_value = arg } };
            continue;
        }

        if (std.mem.startsWith(u8, arg, "--input=")) {
            options.input = arg["--input=".len..];
            continue;
        }

        if (std.mem.eql(u8, arg, "--output") or std.mem.eql(u8, arg, "-o")) {
            index += 1;
            options.output = readFlagValue(args, index) orelse return .{ .err = .{ .missing_value = arg } };
            continue;
        }

        if (std.mem.startsWith(u8, arg, "--output=")) {
            options.output = arg["--output=".len..];
            continue;
        }

        return .{ .err = .{ .unknown_option = arg } };
    }

    return .{ .ok = options };
}

fn readFlagValue(args: []const []const u8, index: usize) ?[]const u8 {
    if (index >= args.len or std.mem.startsWith(u8, args[index], "-")) {
        return null;
    }

    return args[index];
}

fn writeCliError(writer: *std.Io.Writer, cli_error: CliError) std.Io.Writer.Error!void {
    switch (cli_error) {
        .missing_value => |flag| try writer.print("Missing value for {s}\n", .{flag}),
        .unknown_option => |option| try writer.print("Unknown option: {s}\n", .{option}),
        .missing_home => |value| try writer.print("Cannot expand {s}: HOME and USERPROFILE are not set\n", .{value}),
        .path_error => |value| try writer.print("Cannot process path: {s}\n", .{value}),
    }
}

fn renderTargetName(target: render_html.RenderTarget) []const u8 {
    return switch (target) {
        .plan => "plan",
        .map => "map",
    };
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

pub fn writePlanHelp(writer: *std.Io.Writer) std.Io.Writer.Error!void {
    try writer.writeAll(
        \\matcha plan
        \\
        \\Usage:
        \\  matcha plan [options]
        \\  matcha plan read <path>
        \\
        \\Render a plan JSON file to a self-contained HTML page. Without --input, it reads
        \\sample_plan.json; without --output, it writes dist/plan.html.
        \\
        \\Options:
        \\  -i, --input <path>    Plan JSON file to render
        \\  -o, --output <path>   HTML file to write
        \\
        \\Read subcommand:
        \\  matcha plan read <path>  Print a matcha plan as Markdown to stdout. The path can be
        \\                        raw plan JSON or a matcha-generated plan HTML file.
        \\
        \\Plan input format:
        \\
    );
    try writeIndentedTrimmed(writer, assets.llm_output_format.contents);
}

pub fn writeMapHelp(writer: *std.Io.Writer) std.Io.Writer.Error!void {
    try writer.writeAll(
        \\matcha map
        \\
        \\Usage:
        \\  matcha map [options]
        \\
        \\Render a UML-style map JSON file to a self-contained HTML page. Without --input,
        \\it reads sample_map.json; without --output, it writes dist/map.html.
        \\
        \\Options:
        \\  -i, --input <path>    Map JSON file to render
        \\  -o, --output <path>   HTML file to write
        \\
        \\Map input format:
        \\
    );
    try writeIndentedTrimmed(writer, assets.llm_uml_output_format.contents);
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

test "render command defaults match current CLI" {
    const plan_options = expectRenderOptions(parseRenderOptions(.plan, &.{}));
    try std.testing.expectEqual(render_html.RenderTarget.plan, plan_options.target);
    try std.testing.expectEqualStrings("sample_plan.json", plan_options.input);
    try std.testing.expectEqualStrings("dist/plan.html", plan_options.output);

    const map_options = expectRenderOptions(parseRenderOptions(.map, &.{}));
    try std.testing.expectEqual(render_html.RenderTarget.map, map_options.target);
    try std.testing.expectEqualStrings("sample_map.json", map_options.input);
    try std.testing.expectEqualStrings("dist/map.html", map_options.output);
}

test "render command parses separated input and output flags" {
    const plan_options = expectRenderOptions(parseRenderOptions(.plan, &.{
        "-i",
        "plans/input.json",
        "-o",
        "dist/custom-plan.html",
    }));
    try std.testing.expectEqualStrings("plans/input.json", plan_options.input);
    try std.testing.expectEqualStrings("dist/custom-plan.html", plan_options.output);

    const map_options = expectRenderOptions(parseRenderOptions(.map, &.{
        "--input",
        "maps/input.json",
        "--output",
        "dist/custom-map.html",
    }));
    try std.testing.expectEqualStrings("maps/input.json", map_options.input);
    try std.testing.expectEqualStrings("dist/custom-map.html", map_options.output);
}

test "render command parses equals-style input and output flags" {
    const plan_options = expectRenderOptions(parseRenderOptions(.plan, &.{
        "--input=plans/input.json",
        "--output=dist/custom-plan.html",
    }));
    try std.testing.expectEqualStrings("plans/input.json", plan_options.input);
    try std.testing.expectEqualStrings("dist/custom-plan.html", plan_options.output);

    const map_options = expectRenderOptions(parseRenderOptions(.map, &.{
        "--output=dist/custom-map.html",
        "--input=maps/input.json",
    }));
    try std.testing.expectEqualStrings("maps/input.json", map_options.input);
    try std.testing.expectEqualStrings("dist/custom-map.html", map_options.output);
}

test "render command rejects missing flag values" {
    try expectMissingValue("-i", parseRenderOptions(.plan, &.{"-i"}));
    try expectMissingValue("--input", parseRenderOptions(.plan, &.{ "--input", "--output", "dist/plan.html" }));
    try expectMissingValue("-o", parseRenderOptions(.map, &.{"-o"}));
    try expectMissingValue("--output", parseRenderOptions(.map, &.{ "--output", "-i", "sample_map.json" }));
}

test "render command rejects unknown options" {
    try expectUnknownOption("--theme", parseRenderOptions(.plan, &.{ "--theme", "dracula" }));
    try expectUnknownOption("sample_map.json", parseRenderOptions(.map, &.{"sample_map.json"}));
}

test "runArgs reports render option errors to stderr" {
    var stdout_buffer: [2048]u8 = undefined;
    var stderr_buffer: [256]u8 = undefined;
    var stdout: std.Io.Writer = .fixed(&stdout_buffer);
    var stderr: std.Io.Writer = .fixed(&stderr_buffer);

    const code = try runArgs(&.{ "plan", "--wat" }, &stdout, &stderr);

    try std.testing.expectEqual(ExitCode.usage, code);
    try std.testing.expectEqual(@as(usize, 0), stdout.end);
    try std.testing.expect(std.mem.indexOf(u8, stderr_buffer[0..stderr.end], "Unknown option: --wat") != null);
}

test "render command help aliases print subcommand help" {
    var stdout_buffer: [32768]u8 = undefined;
    var stderr_buffer: [128]u8 = undefined;
    var stdout: std.Io.Writer = .fixed(&stdout_buffer);
    var stderr: std.Io.Writer = .fixed(&stderr_buffer);

    const plan_code = try runArgs(&.{ "plan", "--help" }, &stdout, &stderr);
    const plan_output = stdout_buffer[0..stdout.end];
    try std.testing.expectEqual(ExitCode.ok, plan_code);
    try std.testing.expect(std.mem.indexOf(u8, plan_output, "matcha plan") != null);
    try std.testing.expect(std.mem.indexOf(u8, plan_output, "Plan input format:") != null);

    stdout = .fixed(&stdout_buffer);
    stderr = .fixed(&stderr_buffer);
    const map_code = try runArgs(&.{ "map", "-h" }, &stdout, &stderr);
    const map_output = stdout_buffer[0..stdout.end];
    try std.testing.expectEqual(ExitCode.ok, map_code);
    try std.testing.expect(std.mem.indexOf(u8, map_output, "matcha map") != null);
    try std.testing.expect(std.mem.indexOf(u8, map_output, "Map input format:") != null);
}

fn expectRenderOptions(result: RenderOptionsResult) RenderOptions {
    return switch (result) {
        .ok => |options| options,
        .err => unreachable,
    };
}

fn expectMissingValue(expected_flag: []const u8, result: RenderOptionsResult) !void {
    switch (result) {
        .ok => return error.ExpectedError,
        .err => |cli_error| switch (cli_error) {
            .missing_value => |flag| {
                try std.testing.expectEqualStrings(expected_flag, flag);
                return;
            },
            .unknown_option => return error.WrongError,
        },
    }
}

fn expectUnknownOption(expected_option: []const u8, result: RenderOptionsResult) !void {
    switch (result) {
        .ok => return error.ExpectedError,
        .err => |cli_error| switch (cli_error) {
            .missing_value => return error.WrongError,
            .unknown_option => |option| {
                try std.testing.expectEqualStrings(expected_option, option);
                return;
            },
        },
    }
}
